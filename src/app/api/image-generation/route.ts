import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

interface RequestBody {
  prompt: string;
  size?: "1024x1024" | "768x1344" | "864x1152" | "1344x768" | "1152x864" | "1440x720" | "720x1440";
  conversationId?: string;
  userInstruction: string; // original Arabic instruction
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

    // Generate the image
    const result = await zai.images.generations.create({
      prompt: body.prompt,
      size: body.size || "1024x1024",
    });

    if (!result?.data?.[0]?.base64) {
      throw new Error("استجابة غير صالحة من خدمة توليد الصور");
    }

    // On Vercel, we return the base64 directly (no filesystem)
    // The frontend will display it inline via data URL
    const base64Data = result.data[0].base64;
    const dataUrl = `data:image/png;base64,${base64Data}`;

    // Save message to DB if conversation exists
    if (body.conversationId) {
      // Save user message
      await db.message.create({
        data: {
          conversationId: body.conversationId,
          role: "user",
          content: body.userInstruction || body.prompt,
          mode: "image",
          language: "plaintext",
        },
      });

      // Save assistant message with base64 image marker
      // Note: For Vercel deployment, we save the base64 directly in the message
      // This works for small images but for production, use Vercel Blob or Cloudinary
      const assistantContent = `إليك الصورة المُولّدة بناءً على الوصف:\n\n[[IMAGE_BASE64:${base64Data.substring(0, 100)}...]]\n\n**الـ Prompt المستخدم:**\n\`\`\`\n${body.prompt}\n\`\`\``;
      await db.message.create({
        data: {
          conversationId: body.conversationId,
          role: "assistant",
          content: assistantContent,
          mode: "image",
          language: "plaintext",
        },
      });
    }

    return NextResponse.json({
      success: true,
      imageData: base64Data,
      imageUrl: dataUrl,
      prompt: body.prompt,
    });
  } catch (err: any) {
    console.error("[image-generation] Error:", err);
    return NextResponse.json(
      { error: `تعذّر توليد الصورة: ${err?.message || "خطأ غير معروف"}` },
      { status: 500 }
    );
  }
}
