import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { detectLanguage } from "@/lib/code-assistant/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/conversations/[id]/files - Add or update files for a conversation
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    const files: Array<{ filename: string; content: string; language?: string }> = body.files || [];

    // Verify conversation exists
    const conversation = await db.conversation.findUnique({ where: { id } });
    if (!conversation) {
      return NextResponse.json({ error: "المحادثة غير موجودة" }, { status: 404 });
    }

    const created = [];
    for (const file of files) {
      const language = file.language || detectLanguage(file.filename);
      const existing = await db.codeFile.findFirst({
        where: { conversationId: id, filename: file.filename },
      });
      if (existing) {
        const updated = await db.codeFile.update({
          where: { id: existing.id },
          data: { content: file.content, language },
        });
        created.push({
          id: updated.id,
          filename: updated.filename,
          language: updated.language,
          content: updated.content,
        });
      } else {
        const created_file = await db.codeFile.create({
          data: {
            conversationId: id,
            filename: file.filename,
            language,
            content: file.content,
          },
        });
        created.push({
          id: created_file.id,
          filename: created_file.filename,
          language: created_file.language,
          content: created_file.content,
        });
      }
    }

    return NextResponse.json({ files: created });
  } catch (err: any) {
    console.error("[files create] Error:", err);
    return NextResponse.json(
      { error: "تعذّر حفظ الملفات" },
      { status: 500 }
    );
  }
}

// DELETE /api/conversations/[id]/files?filename=xxx - Delete a file
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const filename = url.searchParams.get("filename");
    const fileId = url.searchParams.get("fileId");

    if (fileId) {
      await db.codeFile.delete({ where: { id: fileId } }).catch(() => null);
    } else if (filename) {
      await db.codeFile.deleteMany({
        where: { conversationId: id, filename },
      });
    } else {
      return NextResponse.json(
        { error: "filename أو fileId مطلوب" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[files delete] Error:", err);
    return NextResponse.json(
      { error: "تعذّر حذف الملف" },
      { status: 500 }
    );
  }
}
