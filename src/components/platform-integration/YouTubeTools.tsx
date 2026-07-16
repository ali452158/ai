"use client";

import { useState, useCallback } from "react";
import {
  Youtube,
  Search,
  TrendingUp,
  Video,
  Eye,
  ThumbsUp,
  MessageCircle,
  Users,
  Loader2,
  ExternalLink,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useApiKeys } from "@/hooks/use-api-keys";

interface YouTubeToolsProps {
  onClose?: () => void;
}

const REGIONS = [
  { code: "SA", label: "السعودية" },
  { code: "EG", label: "مصر" },
  { code: "AE", label: "الإمارات" },
  { code: "KW", label: "الكويت" },
  { code: "QA", label: "قطر" },
  { code: "JO", label: "الأردن" },
  { code: "MA", label: "المغرب" },
  { code: "DZ", label: "الجزائر" },
  { code: "US", label: "أمريكا" },
  { code: "GB", label: "بريطانيا" },
];

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days > 365) return `قبل ${Math.floor(days / 365)} سنة`;
  if (days > 30) return `قبل ${Math.floor(days / 30)} شهر`;
  if (days > 0) return `قبل ${days} يوم`;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours > 0) return `قبل ${hours} ساعة`;
  return "الآن";
}

export default function YouTubeTools({ onClose }: YouTubeToolsProps) {
  const { apiKeys, hasYouTube } = useApiKeys();
  const [activeTool, setActiveTool] = useState<"search" | "trending" | "video">("search");

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Trending state
  const [region, setRegion] = useState("SA");
  const [trendingResults, setTrendingResults] = useState<any[]>([]);
  const [loadingTrending, setLoadingTrending] = useState(false);

  // Video analysis state
  const [videoUrl, setVideoUrl] = useState("");
  const [videoData, setVideoData] = useState<any>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?#/]+)/,
    ];
    for (const p of patterns) {
      const match = url.match(p);
      if (match) return match[1];
    }
    return null;
  };

  const handleSearch = useCallback(async () => {
    if (!hasYouTube) {
      toast.error("أضف مفتاح YouTube API أولاً من زر المفاتيح");
      return;
    }
    if (!searchQuery.trim()) {
      toast.error("اكتب كلمة البحث");
      return;
    }
    setSearching(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "search",
          apiKey: apiKeys.youtubeApiKey,
          query: searchQuery,
          maxResults: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.results || []);
      toast.success(`تم العثور على ${data.results?.length || 0} نتيجة`);
    } catch (err: any) {
      toast.error(err.message || "فشل البحث");
    } finally {
      setSearching(false);
    }
  }, [hasYouTube, searchQuery, apiKeys.youtubeApiKey]);

  const handleTrending = useCallback(async () => {
    if (!hasYouTube) {
      toast.error("أضف مفتاح YouTube API أولاً من زر المفاتيح");
      return;
    }
    setLoadingTrending(true);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "trending",
          apiKey: apiKeys.youtubeApiKey,
          regionCode: region,
          maxResults: 15,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTrendingResults(data.results || []);
      toast.success(`تم جلب ${data.results?.length || 0} فيديو رائج`);
    } catch (err: any) {
      toast.error(err.message || "فشل جلب الترندات");
    } finally {
      setLoadingTrending(false);
    }
  }, [hasYouTube, region, apiKeys.youtubeApiKey]);

  const handleVideoAnalysis = useCallback(async () => {
    if (!hasYouTube) {
      toast.error("أضف مفتاح YouTube API أولاً من زر المفاتيح");
      return;
    }
    const videoId = extractVideoId(videoUrl) || videoUrl.trim();
    if (!videoId) {
      toast.error("أدخل رابط فيديو صحيح");
      return;
    }
    setLoadingVideo(true);
    setVideoData(null);
    try {
      const res = await fetch("/api/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "video",
          apiKey: apiKeys.youtubeApiKey,
          videoId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVideoData(data.video);
      toast.success("تم جلب بيانات الفيديو");
    } catch (err: any) {
      toast.error(err.message || "فشل جلب بيانات الفيديو");
    } finally {
      setLoadingVideo(false);
    }
  }, [hasYouTube, videoUrl, apiKeys.youtubeApiKey]);

  if (!hasYouTube) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Youtube className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-semibold mb-1">YouTube API غير مُفعّل</h3>
        <p className="text-xs text-muted-foreground max-w-xs">
          أضف مفتاح YouTube Data API من زر "المفاتيح" في الأعلى لتفعيل أدوات التحليل والبحث والترندات.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tool tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <button
          onClick={() => setActiveTool("search")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "search"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          بحث
        </button>
        <button
          onClick={() => setActiveTool("trending")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "trending"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          ترندات
        </button>
        <button
          onClick={() => setActiveTool("video")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "video"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="h-3.5 w-3.5" />
          تحليل فيديو
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Search Tool */}
          {activeTool === "search" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">ابحث في فيديوهات يوتيوب</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="مثال: تعلم البرمجة، طبخ سعودي، تداول عملات..."
                    className="text-xs h-8"
                    disabled={searching}
                  />
                  <Button
                    onClick={handleSearch}
                    size="sm"
                    disabled={searching || !searchQuery.trim()}
                    className="h-8 px-2"
                  >
                    {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    نتائج البحث ({searchResults.length})
                  </div>
                  {searchResults.map((v, i) => (
                    <a
                      key={i}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2 rounded-md border border-border bg-card p-2 hover:bg-muted/50 transition-colors"
                    >
                      {v.thumbnail && (
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          className="w-24 h-14 object-cover rounded shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium line-clamp-2 mb-1">{v.title}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span className="truncate">{v.channelTitle}</span>
                          <span>·</span>
                          <span>{timeAgo(v.publishedAt)}</span>
                        </div>
                      </div>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-1" />
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Trending Tool */}
          {activeTool === "trending" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">الفيديوهات الرائجة حسب الدولة</Label>
                <div className="flex gap-1.5">
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="text-xs h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((r) => (
                        <SelectItem key={r.code} value={r.code} className="text-xs">
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleTrending}
                    size="sm"
                    disabled={loadingTrending}
                    className="h-8 px-2"
                  >
                    {loadingTrending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {trendingResults.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    رائج في {REGIONS.find((r) => r.code === region)?.label}
                  </div>
                  {trendingResults.map((v, i) => (
                    <a
                      key={i}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-2 rounded-md border border-border bg-card p-2 hover:bg-muted/50 transition-colors"
                    >
                      {v.thumbnail && (
                        <img
                          src={v.thumbnail}
                          alt={v.title}
                          className="w-24 h-14 object-cover rounded shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium line-clamp-2 mb-1">{v.title}</div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                          <span className="truncate">{v.channelTitle}</span>
                          <Badge variant="secondary" className="text-[9px] gap-0.5 h-3.5">
                            <Eye className="h-2.5 w-2.5" />
                            {formatNumber(v.viewCount)}
                          </Badge>
                          {v.likeCount > 0 && (
                            <Badge variant="secondary" className="text-[9px] gap-0.5 h-3.5">
                              <ThumbsUp className="h-2.5 w-2.5" />
                              {formatNumber(v.likeCount)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Video Analysis Tool */}
          {activeTool === "video" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">حلل أي فيديو يوتيوب</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVideoAnalysis()}
                    placeholder="الصق رابط الفيديو أو الـ ID..."
                    className="text-xs h-8"
                    dir="ltr"
                    disabled={loadingVideo}
                  />
                  <Button
                    onClick={handleVideoAnalysis}
                    size="sm"
                    disabled={loadingVideo || !videoUrl.trim()}
                    className="h-8 px-2"
                  >
                    {loadingVideo ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>

              {videoData && (
                <div className="rounded-md border border-border bg-card p-3 space-y-3">
                  {videoData.thumbnails?.medium && (
                    <img
                      src={videoData.thumbnails.medium.url}
                      alt={videoData.title}
                      className="w-full rounded"
                    />
                  )}
                  <div>
                    <div className="text-sm font-semibold mb-1">{videoData.title}</div>
                    <div className="text-xs text-muted-foreground">{videoData.channelTitle}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <Eye className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold">{formatNumber(videoData.statistics.viewCount)}</div>
                      <div className="text-[10px] text-muted-foreground">مشاهدة</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold">{formatNumber(videoData.statistics.likeCount)}</div>
                      <div className="text-[10px] text-muted-foreground">إعجاب</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <MessageCircle className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold">{formatNumber(videoData.statistics.commentCount)}</div>
                      <div className="text-[10px] text-muted-foreground">تعليق</div>
                    </div>
                    <div className="rounded-md bg-muted/30 p-2 text-center">
                      <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                      <div className="text-sm font-bold">
                        {videoData.statistics.viewCount > 0
                          ? formatNumber(Math.round(videoData.statistics.likeCount / videoData.statistics.viewCount * 1000) / 10) + "%"
                          : "—"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">معدل التفاعل</div>
                    </div>
                  </div>

                  {videoData.tags && videoData.tags.length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5">الـ Tags:</div>
                      <div className="flex flex-wrap gap-1">
                        {videoData.tags.slice(0, 10).map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {videoData.description && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">الوصف:</div>
                      <p className="text-xs text-foreground/80 line-clamp-4 whitespace-pre-wrap">
                        {videoData.description}
                      </p>
                    </div>
                  )}

                  <a
                    href={`https://youtube.com/watch?v=${videoData.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    فتح الفيديو في يوتيوب
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
