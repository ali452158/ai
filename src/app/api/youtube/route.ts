import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

interface YouTubeRequest {
  action: "search" | "video" | "channel" | "trending" | "comments";
  apiKey: string;
  query?: string;
  videoId?: string;
  channelId?: string;
  regionCode?: string;
  maxResults?: number;
}

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as YouTubeRequest;

    if (!body.apiKey) {
      return NextResponse.json(
        { error: "مفتاح YouTube API مطلوب. احصل عليه من Google Cloud Console." },
        { status: 400 }
      );
    }

    if (!body.action) {
      return NextResponse.json({ error: "action مطلوب" }, { status: 400 });
    }

    const apiKey = body.apiKey;
    const maxResults = Math.min(body.maxResults || 10, 50);

    switch (body.action) {
      case "search": {
        if (!body.query) {
          return NextResponse.json({ error: "query مطلوب للبحث" }, { status: 400 });
        }
        const url = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(
          body.query
        )}&type=video&maxResults=${maxResults}&key=${apiKey}&relevanceLanguage=ar`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error?.message || "فشل البحث في YouTube" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          results: (data.items || []).map((item: any) => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          })),
          totalResults: data.pageInfo?.totalResults || 0,
        });
      }

      case "video": {
        if (!body.videoId) {
          return NextResponse.json({ error: "videoId مطلوب" }, { status: 400 });
        }
        const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${body.videoId}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error?.message || "فشل جلب بيانات الفيديو" },
            { status: res.status }
          );
        }
        const item = data.items?.[0];
        if (!item) {
          return NextResponse.json({ error: "الفيديو غير موجود" }, { status: 404 });
        }
        return NextResponse.json({
          video: {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            tags: item.snippet.tags || [],
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
            duration: item.contentDetails?.duration,
            statistics: {
              viewCount: parseInt(item.statistics?.viewCount || "0"),
              likeCount: parseInt(item.statistics?.likeCount || "0"),
              commentCount: parseInt(item.statistics?.commentCount || "0"),
              favoriteCount: parseInt(item.statistics?.favoriteCount || "0"),
            },
          },
        });
      }

      case "channel": {
        if (!body.channelId) {
          return NextResponse.json({ error: "channelId مطلوب" }, { status: 400 });
        }
        const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,contentDetails&id=${body.channelId}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error?.message || "فشل جلب بيانات القناة" },
            { status: res.status }
          );
        }
        const item = data.items?.[0];
        if (!item) {
          return NextResponse.json({ error: "القناة غير موجودة" }, { status: 404 });
        }
        return NextResponse.json({
          channel: {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            customUrl: item.snippet.customUrl,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
            country: item.snippet.country,
            statistics: {
              viewCount: parseInt(item.statistics?.viewCount || "0"),
              subscriberCount: parseInt(item.statistics?.subscriberCount || "0"),
              hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount || false,
              videoCount: parseInt(item.statistics?.videoCount || "0"),
            },
          },
        });
      }

      case "trending": {
        const region = body.regionCode || "SA";
        const url = `${YOUTUBE_API_BASE}/videos?part=snippet,statistics&chart=mostPopular&regionCode=${region}&maxResults=${maxResults}&key=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error?.message || "فشل جلب الترندات" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          region,
          results: (data.items || []).map((item: any) => ({
            videoId: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            publishedAt: item.snippet.publishedAt,
            thumbnail: item.snippet.thumbnails?.medium?.url,
            viewCount: parseInt(item.statistics?.viewCount || "0"),
            likeCount: parseInt(item.statistics?.likeCount || "0"),
            commentCount: parseInt(item.statistics?.commentCount || "0"),
          })),
        });
      }

      case "comments": {
        if (!body.videoId) {
          return NextResponse.json({ error: "videoId مطلوب" }, { status: 400 });
        }
        const url = `${YOUTUBE_API_BASE}/commentThreads?part=snippet&videoId=${body.videoId}&maxResults=${maxResults}&key=${apiKey}&order=relevance`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.error?.message || "فشل جلب التعليقات" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          comments: (data.items || []).map((item: any) => {
            const top = item.snippet?.topLevelComment?.snippet;
            return {
              author: top?.authorDisplayName,
              text: top?.textDisplay,
              likeCount: top?.likeCount || 0,
              publishedAt: top?.publishedAt,
              replyCount: item.snippet?.totalReplyCount || 0,
            };
          }),
        });
      }

      default:
        return NextResponse.json({ error: "action غير مدعوم" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[youtube] Error:", err);
    return NextResponse.json(
      { error: `خطأ في YouTube API: ${err?.message || "غير معروف"}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "YouTube Data API Integration",
    actions: ["search", "video", "channel", "trending", "comments"],
    note: "أرسل POST request مع apiKey و action",
  });
}
