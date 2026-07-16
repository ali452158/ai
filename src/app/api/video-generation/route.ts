import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RequestBody {
  prompt: string;
  duration?: number; // seconds
  quality?: "speed" | "quality";
  withAudio?: boolean;
  conversationId?: string;
  userInstruction: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RequestBody;

    if (!body.prompt) {
      return NextResponse.json(
        { error: "prompt مطلوب" },
        { status: 400 }
      );
    }

    const zai = await ZAI.create();

    // Create video generation task
    const result = await zai.video.generations.create({
      prompt: body.prompt,
      duration: body.duration || 5,
      quality: body.quality || "speed",
      with_audio: body.withAudio ?? true,
    });

    if (!result?.id) {
      throw new Error("استجابة غير صالحة من خدمة توليد الفيديو");
    }

    // Save user message to DB
    if (body.conversationId) {
      await db.message.create({
        data: {
          conversationId: body.conversationId,
          role: "user",
          content: body.userInstruction || body.prompt,
          mode: "video",
          language: "plaintext",
        },
      });
    }

    return NextResponse.json({
      success: true,
      taskId: result.id,
      status: result.task_status || "PROCESSING",
      prompt: body.prompt,
    });
  } catch (err: any) {
    console.error("[video-generation] Error:", err);
    return NextResponse.json(
      { error: `تعذّر بدء توليد الفيديو: ${err?.message || "خطأ غير معروف"}` },
      { status: 500 }
    );
  }
}
