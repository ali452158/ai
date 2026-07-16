import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import {
  buildSystemPrompt,
  buildUserMessage,
  generateTitle,
  detectLanguage,
  type Mode,
  type CodeFile,
} from "@/lib/code-assistant/shared";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  code: string;
  language: string;
  mode: Mode;
  instruction: string;
  targetLanguage?: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  files?: Array<{ filename: string; language: string; content: string }>;
  conversationId?: string;
  stream?: boolean;
  userPreferences?: string;
}

// SSE event helpers
function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// Modes that don't require code
const NO_CODE_MODES: Mode[] = ["generate", "custom", "indicators", "bots", "youtube", "telegram", "tiktok", "seo", "image", "video", "youtube-analytics", "telegram-bot"];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.mode || body.instruction === undefined) {
      return NextResponse.json(
        { error: "الحقول المطلوبة ناقصة: mode و instruction" },
        { status: 400 }
      );
    }

    // Special API modes (image/video) use this endpoint to generate the optimized prompt,
    // then the frontend calls the dedicated /api/image-generation or /api/video-generation endpoint.
    // We allow them through here for prompt optimization only.

    if (
      !NO_CODE_MODES.includes(body.mode) &&
      !body.code &&
      !(body.files && body.files.length > 0)
    ) {
      return NextResponse.json(
        { error: "الكود مطلوب لهذا الوضع. استخدم وضع 'التوليد' أو 'المحادثة' أو أحد الأوضاع المتخصصة." },
        { status: 400 }
      );
    }

    // Conversation management: get or create
    let conversationId = body.conversationId;
    if (!conversationId) {
      const title = generateTitle(body.instruction || "محادثة جديدة");
      const conversation = await db.conversation.create({
        data: {
          title,
          mode: body.mode,
          language: body.language,
        },
      });
      conversationId = conversation.id;
    } else {
      // Touch the updatedAt timestamp
      await db.conversation
        .update({
          where: { id: conversationId },
          data: { updatedAt: new Date(), mode: body.mode, language: body.language },
        })
        .catch(() => null);
    }

    // Save uploaded files to DB (if any new ones are present)
    if (body.files && body.files.length > 0) {
      // For performance, only save files if they don't already exist for this conversation
      const existingFiles = await db.codeFile.findMany({
        where: { conversationId },
        select: { filename: true, content: true },
      });

      for (const file of body.files) {
        const exists = existingFiles.some(
          (ef) => ef.filename === file.filename && ef.content === file.content
        );
        if (!exists) {
          await db.codeFile.create({
            data: {
              conversationId,
              filename: file.filename,
              language: file.language || detectLanguage(file.filename),
              content: file.content,
            },
          });
        }
      }
    }

    // Build the messages for the AI
    const systemPrompt = buildSystemPrompt(
      body.mode,
      body.language,
      body.targetLanguage,
      body.files && body.files.length > 1,
      body.userPreferences
    );
    const userMessage = buildUserMessage({
      code: body.code,
      language: body.language,
      mode: body.mode,
      instruction: body.instruction,
      targetLanguage: body.targetLanguage,
      files: body.files,
    });

    const zai = await ZAI.create();

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (body.history && Array.isArray(body.history)) {
      const recentHistory = body.history.slice(-6);
      for (const msg of recentHistory) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: userMessage });

    // Save the user message to DB (skip for image/video - the dedicated API will save it)
    const isMediaMode = body.mode === "image" || body.mode === "video";
    if (!isMediaMode) {
      await db.message.create({
        data: {
          conversationId,
          role: "user",
          content: body.instruction || (body.mode === "explain" ? "اشرح هذا الكود" : body.mode === "review" ? "راجع هذا الكود" : ""),
          mode: body.mode,
          language: body.language,
        },
      });
    }

    // Update conversation title if it's still the default
    if (body.instruction) {
      const conv = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { title: true, messages: { select: { id: true }, take: 2 } },
      });
      if (conv && conv.messages.length <= 1 && (conv.title === "محادثة جديدة" || conv.title.startsWith("محادثة"))) {
        await db.conversation.update({
          where: { id: conversationId },
          data: { title: generateTitle(body.instruction) },
        });
      }
    }

    // If streaming requested, return a stream response
    if (body.stream) {
      const completion = (await zai.chat.completions.create({
        messages,
        temperature: 0.3,
        max_tokens: 4096,
        stream: true,
      })) as ReadableStream<Uint8Array> | null;

      if (!completion) {
        // Fallback to non-streaming if stream failed
        const fallback = await zai.chat.completions.create({
          messages,
          temperature: 0.3,
          max_tokens: 4096,
        });
        const text =
          fallback?.choices?.[0]?.message?.content ??
          fallback?.message?.content ??
          (typeof fallback === "string" ? fallback : "") ??
          "عذراً، لم أتمكن من توليد رد.";

        await db.message.create({
          data: {
            conversationId,
            role: "assistant",
            content: text,
            mode: body.mode,
            language: body.language,
          },
        });

        return new Response(sseEvent({ type: "done", response: text, conversationId }), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }

      // Create a streaming response that pipes through the AI stream
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      let fullText = "";

      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Send conversationId first
            controller.enqueue(
              encoder.encode(sseEvent({ type: "init", conversationId }))
            );

            const reader = completion.getReader();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;

                const dataStr = trimmed.slice(5).trim();
                if (dataStr === "[DONE]") continue;

                try {
                  const parsed = JSON.parse(dataStr);
                  const delta =
                    parsed?.choices?.[0]?.delta?.content ??
                    parsed?.choices?.[0]?.message?.content ??
                    parsed?.delta ??
                    parsed?.content ??
                    (typeof parsed === "string" ? parsed : "");

                  if (delta) {
                    fullText += delta;
                    controller.enqueue(
                      encoder.encode(sseEvent({ type: "delta", content: delta }))
                    );
                  }
                } catch {
                  // If JSON parsing fails, treat the raw line as a chunk
                  if (dataStr && dataStr !== "[DONE]") {
                    fullText += dataStr;
                    controller.enqueue(
                      encoder.encode(sseEvent({ type: "delta", content: dataStr }))
                    );
                  }
                }
              }
            }

            // Process any remaining buffer
            if (buffer.trim()) {
              const trimmed = buffer.trim();
              if (trimmed.startsWith("data:")) {
                const dataStr = trimmed.slice(5).trim();
                if (dataStr && dataStr !== "[DONE]") {
                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta =
                      parsed?.choices?.[0]?.delta?.content ??
                      parsed?.choices?.[0]?.message?.content ??
                      parsed?.delta ??
                      parsed?.content ??
                      "";
                    if (delta) {
                      fullText += delta;
                      controller.enqueue(
                        encoder.encode(sseEvent({ type: "delta", content: delta }))
                      );
                    }
                  } catch {
                    fullText += dataStr;
                    controller.enqueue(
                      encoder.encode(sseEvent({ type: "delta", content: dataStr }))
                    );
                  }
                }
              }
            }

            // Save the complete assistant message to DB (skip for media modes - dedicated API saves it)
            const finalText = fullText || "عذراً، لم أتلقّ رداً صالحاً.";
            if (!isMediaMode) {
              await db.message.create({
                data: {
                  conversationId,
                  role: "assistant",
                  content: finalText,
                  mode: body.mode,
                  language: body.language,
                },
              });
            }

            controller.enqueue(
              encoder.encode(sseEvent({ type: "done", conversationId }))
            );
            controller.close();
          } catch (err: any) {
            console.error("[stream] Error:", err);
            const errMsg = err?.message || "حدث خطأ أثناء البث";
            // Save partial response if any
            if (fullText) {
              await db.message.create({
                data: {
                  conversationId,
                  role: "assistant",
                  content: fullText,
                  mode: body.mode,
                  language: body.language,
                },
              }).catch(() => null);
            }
            controller.enqueue(
              encoder.encode(sseEvent({ type: "error", error: errMsg }))
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-streaming path (legacy + fallback)
    const completion = await zai.chat.completions.create({
      messages,
      temperature: 0.3,
      max_tokens: 4096,
    });

    const responseText: string =
      completion?.choices?.[0]?.message?.content ??
      completion?.message?.content ??
      (typeof completion === "string" ? completion : "") ??
      "عذراً، لم أتمكن من توليد رد. حاول مرة أخرى.";

    // Save assistant message (skip for media modes - dedicated API saves it)
    if (!isMediaMode) {
      await db.message.create({
        data: {
          conversationId,
          role: "assistant",
          content: responseText,
          mode: body.mode,
          language: body.language,
        },
      });
    }

    return NextResponse.json({
      response: responseText,
      conversationId,
      usage: completion?.usage ?? null,
    });
  } catch (err: any) {
    console.error("[code-assistant] Error:", err);
    const message =
      err?.message || err?.toString() || "حدث خطأ غير متوقع أثناء المعالجة.";
    return NextResponse.json(
      { error: `تعذّر الاتصال بالمساعد الذكي: ${message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "CodeMentor API",
    version: "2.0.0",
    modes: ["edit", "generate", "explain", "review", "convert", "custom"],
    features: ["streaming", "persistence", "multi-file"],
  });
}
