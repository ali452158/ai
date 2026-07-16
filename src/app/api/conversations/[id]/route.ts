import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] - Get a conversation with messages and files
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        files: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "المحادثة غير موجودة" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      language: conversation.language,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        mode: m.mode,
        language: m.language,
        error: m.error,
        timestamp: m.createdAt.getTime(),
      })),
      files: conversation.files.map((f) => ({
        id: f.id,
        filename: f.filename,
        language: f.language,
        content: f.content,
      })),
    });
  } catch (err: any) {
    console.error("[conversation get] Error:", err);
    return NextResponse.json(
      { error: "تعذّر جلب المحادثة" },
      { status: 500 }
    );
  }
}

// PATCH /api/conversations/[id] - Update conversation (title, mode, language)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.mode === "string") data.mode = body.mode;
    if (typeof body.language === "string") data.language = body.language;

    const updated = await db.conversation.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      mode: updated.mode,
      language: updated.language,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err: any) {
    console.error("[conversation patch] Error:", err);
    return NextResponse.json(
      { error: "تعذّر تحديث المحادثة" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id] - Delete a conversation
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await db.conversation.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[conversation delete] Error:", err);
    return NextResponse.json(
      { error: "تعذّر حذف المحادثة" },
      { status: 500 }
    );
  }
}
