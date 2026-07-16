import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface DiscordRequest {
  action: "send" | "send-embed" | "validate";
  webhookUrl: string;
  content?: string;
  username?: string;
  avatarUrl?: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    url?: string;
    color?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    authorName?: string;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
    footerText?: string;
  }>;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DiscordRequest;

    if (!body.action) {
      return NextResponse.json({ error: "action مطلوب" }, { status: 400 });
    }

    if (!body.webhookUrl) {
      return NextResponse.json(
        { error: "webhookUrl مطلوب. احصل عليه من إعدادات القناة في ديسكورد: Integrations → Webhooks → New Webhook" },
        { status: 400 }
      );
    }

    // Validate webhook URL format
    const urlPattern = /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
    if (!urlPattern.test(body.webhookUrl)) {
      return NextResponse.json(
        { error: "رابط الـ webhook غير صالح. تأكد من نسخه بالكامل من ديسكورد." },
        { status: 400 }
      );
    }

    switch (body.action) {
      case "validate": {
        // Get webhook info (no message sent)
        const res = await fetch(body.webhookUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: "تعذّر التحقق من الـ webhook. تأكد من صحته." },
            { status: res.status }
          );
        }
        const data = await res.json();
        return NextResponse.json({
          valid: true,
          webhook: {
            id: data.id,
            type: data.type,
            channelId: data.channel_id,
            guildId: data.guild_id,
            name: data.name,
            avatar: data.avatar
              ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
              : null,
          },
        });
      }

      case "send": {
        if (!body.content) {
          return NextResponse.json({ error: "content مطلوب" }, { status: 400 });
        }
        const payload: any = { content: body.content };
        if (body.username) payload.username = body.username;
        if (body.avatarUrl) payload.avatar_url = body.avatarUrl;

        const res = await fetch(body.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `فشل الإرسال (${res.status}): ${errText}` },
            { status: res.status }
          );
        }
        // Discord returns empty body on success (or a message object if wait=true)
        const responseText = await res.text();
        let messageId: string | null = null;
        if (responseText) {
          try {
            const data = JSON.parse(responseText);
            messageId = data.id || null;
          } catch {
            // ignore
          }
        }
        return NextResponse.json({
          success: true,
          messageId,
          sentAt: new Date().toISOString(),
        });
      }

      case "send-embed": {
        if (!body.embeds || body.embeds.length === 0) {
          return NextResponse.json(
            { error: "embeds مطلوبة (على الأقل واحدة)" },
            { status: 400 }
          );
        }
        const formattedEmbeds = body.embeds.map((e) => ({
          title: e.title,
          description: e.description,
          url: e.url,
          color: e.color,
          image: e.imageUrl ? { url: e.imageUrl } : undefined,
          thumbnail: e.thumbnailUrl ? { url: e.thumbnailUrl } : undefined,
          author: e.authorName ? { name: e.authorName } : undefined,
          fields: e.fields,
          footer: e.footerText ? { text: e.footerText } : undefined,
          timestamp: new Date().toISOString(),
        }));
        const payload: any = { embeds: formattedEmbeds };
        if (body.content) payload.content = body.content;
        if (body.username) payload.username = body.username;
        if (body.avatarUrl) payload.avatar_url = body.avatarUrl;

        const res = await fetch(body.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errText = await res.text();
          return NextResponse.json(
            { error: `فشل إرسال الـ embed (${res.status}): ${errText}` },
            { status: res.status }
          );
        }
        const responseText = await res.text();
        let messageId: string | null = null;
        if (responseText) {
          try {
            const data = JSON.parse(responseText);
            messageId = data.id || null;
          } catch {
            // ignore
          }
        }
        return NextResponse.json({
          success: true,
          messageId,
          embedsCount: body.embeds.length,
          sentAt: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json({ error: "action غير مدعوم" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[discord] Error:", err);
    return NextResponse.json(
      { error: `خطأ في Discord API: ${err?.message || "غير معروف"}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Discord Webhook Integration",
    actions: ["send", "send-embed", "validate"],
    note: "أرسل POST request مع webhookUrl و action",
  });
}
