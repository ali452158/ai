import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface TelegramRequest {
  action:
    | "bot-info"
    | "send-message"
    | "send-photo"
    | "send-video"
    | "get-updates"
    | "get-chat"
    | "set-webhook"
    | "get-me";
  botToken: string;
  chatId?: string;
  text?: string;
  photoUrl?: string;
  videoUrl?: string;
  parseMode?: "HTML" | "Markdown" | "MarkdownV2";
  offset?: number;
  limit?: number;
  webhookUrl?: string;
}

function tgApi(token: string, method: string) {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TelegramRequest;

    if (!body.botToken) {
      return NextResponse.json(
        { error: "Bot Token مطلوب. احصل عليه من @BotFather في تلجرام." },
        { status: 400 }
      );
    }

    if (!body.action) {
      return NextResponse.json({ error: "action مطلوب" }, { status: 400 });
    }

    const token = body.botToken;

    switch (body.action) {
      case "bot-info":
      case "get-me": {
        const res = await fetch(tgApi(token, "getMe"));
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "توكن غير صحيح" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          bot: {
            id: data.result.id,
            username: data.result.username,
            firstName: data.result.first_name,
            canJoinGroups: data.result.can_join_groups,
            canReadAllGroupMessages: data.result.can_read_all_group_messages,
            supportsInlineQueries: data.result.supports_inline_queries,
          },
        });
      }

      case "send-message": {
        if (!body.chatId || !body.text) {
          return NextResponse.json(
            { error: "chatId و text مطلوبان" },
            { status: 400 }
          );
        }
        const res = await fetch(tgApi(token, "sendMessage"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: body.chatId,
            text: body.text,
            parse_mode: body.parseMode || "HTML",
            disable_web_page_preview: false,
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل إرسال الرسالة" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          messageId: data.result.message_id,
          chat: {
            id: data.result.chat.id,
            type: data.result.chat.type,
            title: data.result.chat.title,
            username: data.result.chat.username,
          },
          sentAt: new Date(data.result.date * 1000).toISOString(),
        });
      }

      case "send-photo": {
        if (!body.chatId || !body.photoUrl) {
          return NextResponse.json(
            { error: "chatId و photoUrl مطلوبان" },
            { status: 400 }
          );
        }
        const res = await fetch(tgApi(token, "sendPhoto"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: body.chatId,
            photo: body.photoUrl,
            caption: body.text,
            parse_mode: body.parseMode || "HTML",
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل إرسال الصورة" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          messageId: data.result.message_id,
        });
      }

      case "send-video": {
        if (!body.chatId || !body.videoUrl) {
          return NextResponse.json(
            { error: "chatId و videoUrl مطلوبان" },
            { status: 400 }
          );
        }
        const res = await fetch(tgApi(token, "sendVideo"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: body.chatId,
            video: body.videoUrl,
            caption: body.text,
            parse_mode: body.parseMode || "HTML",
          }),
        });
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل إرسال الفيديو" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          messageId: data.result.message_id,
        });
      }

      case "get-updates": {
        const url = `${tgApi(token, "getUpdates")}?offset=${body.offset || 0}&limit=${body.limit || 20}&timeout=0`;
        const res = await fetch(url);
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل جلب التحديثات" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          updates: (data.result || []).map((u: any) => ({
            updateId: u.update_id,
            message: u.message
              ? {
                  messageId: u.message.message_id,
                  date: new Date(u.message.date * 1000).toISOString(),
                  text: u.message.text,
                  from: {
                    id: u.message.from?.id,
                    username: u.message.from?.username,
                    firstName: u.message.from?.first_name,
                  },
                  chat: {
                    id: u.message.chat.id,
                    type: u.message.chat.type,
                    title: u.message.chat.title,
                    username: u.message.chat.username,
                  },
                }
              : null,
          })),
          count: (data.result || []).length,
        });
      }

      case "get-chat": {
        if (!body.chatId) {
          return NextResponse.json({ error: "chatId مطلوب" }, { status: 400 });
        }
        const res = await fetch(`${tgApi(token, "getChat")}?chat_id=${body.chatId}`);
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل جلب معلومات المحادثة" },
            { status: 400 }
          );
        }
        return NextResponse.json({
          chat: {
            id: data.result.id,
            type: data.result.type,
            title: data.result.title,
            username: data.result.username,
            firstName: data.result.first_name,
            description: data.result.description,
            memberCount: data.result.members_count,
          },
        });
      }

      case "set-webhook": {
        if (!body.webhookUrl) {
          // Delete webhook
          const res = await fetch(tgApi(token, "deleteWebhook"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ drop_pending_updates: true }),
          });
          const data = await res.json();
          if (!data.ok) {
            return NextResponse.json(
              { error: data.description || "فشل حذف الـ webhook" },
              { status: 400 }
            );
          }
          return NextResponse.json({ success: true, message: "تم حذف الـ webhook" });
        }
        const res = await fetch(tgApi(token, "setWebhook"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: body.webhookUrl }),
        });
        const data = await res.json();
        if (!data.ok) {
          return NextResponse.json(
            { error: data.description || "فشل تعيين الـ webhook" },
            { status: 400 }
          );
        }
        return NextResponse.json({ success: true, webhookUrl: body.webhookUrl });
      }

      default:
        return NextResponse.json({ error: "action غير مدعوم" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[telegram] Error:", err);
    return NextResponse.json(
      { error: `خطأ في Telegram API: ${err?.message || "غير معروف"}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Telegram Bot API Integration",
    actions: ["bot-info", "send-message", "send-photo", "send-video", "get-updates", "get-chat", "set-webhook"],
    note: "أرسل POST request مع botToken و action",
  });
}
