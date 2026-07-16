import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateTitle } from "@/lib/code-assistant/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/conversations - List all conversations
export async function GET() {
  try {
    const conversations = await db.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        mode: c.mode,
        language: c.language,
        messageCount: c._count.messages,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (err: any) {
    console.error("[conversations list] Error:", err);
    return NextResponse.json(
      { error: "تعذّر جلب المحادثات" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create a new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || generateTitle(body.instruction || "محادثة جديدة");
    const mode = body.mode || "edit";
    const language = body.language || "javascript";

    const conversation = await db.conversation.create({
      data: {
        title,
        mode,
        language,
      },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      language: conversation.language,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[conversations create] Error:", err);
    return NextResponse.json(
      { error: "تعذّر إنشاء المحادثة" },
      { status: 500 }
    );
  }
}
