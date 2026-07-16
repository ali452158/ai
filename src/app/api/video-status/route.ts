import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

interface RequestBody {
  taskId: string;
  prompt?: string;
  conversationId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.taskId) {
      return NextResponse.json({ error: "taskId مطلوب" }, { status: 400 });
    }

    const zai = await ZAI.create();
    const result = await zai.async.result.query(body.taskId);

    if (!result) {
      return NextResponse.json({
        status: "PROCESSING",
        taskId: body.taskId,
      });
    }

    const status = result.task_status || "PROCESSING";

    if (status === "PROCESSING") {
      return NextResponse.json({
        status: "PROCESSING",
        taskId: body.taskId,
      });
    }

    if (status === "FAIL") {
      if (body.conversationId) {
        await db.message.create({
          data: {
            conversationId: body.conversationId,
            role: "assistant",
            content: `فشل توليد الفيديو. حاول مرة أخرى بـ prompt مختلف.\n\n**الـ Prompt:** ${body.prompt || ""}`,
            mode: "video",
            language: "plaintext",
            error: true,
          },
        });
      }
      return NextResponse.json({
        status: "FAIL",
        taskId: body.taskId,
        error: "فشل توليد الفيديو",
      });
    }

    // SUCCESS - extract video URL
    const videoUrl =
      result.video_result?.[0]?.url ||
      result.video_url ||
      result.url ||
      result.video;

    if (!videoUrl || typeof videoUrl !== "string") {
      return NextResponse.json({
        status: "FAIL",
        taskId: body.taskId,
        error: "لم يتم استلام رابط الفيديو",
      });
    }

    // Save assistant message to DB with video URL marker
    if (body.conversationId) {
      const assistantContent = `إليك الفيديو المُولّد:\n\n[[VIDEO_URL:${videoUrl}]]\n\n**الـ Prompt المستخدم:**\n\`\`\`\n${body.prompt || ""}\n\`\`\``;
      await db.message.create({
        data: {
          conversationId: body.conversationId,
          role: "assistant",
          content: assistantContent,
          mode: "video",
          language: "plaintext",
        },
      });
    }

    return NextResponse.json({
      status: "SUCCESS",
      taskId: body.taskId,
      videoUrl,
    });
  } catch (err: any) {
    console.error("[video-status] Error:", err);
    return NextResponse.json(
      { error: `تعذّر التحقق من حالة الفيديو: ${err?.message || "خطأ"}` },
      { status: 500 }
    );
  }
}
