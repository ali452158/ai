"use client";

import { useState, useCallback } from "react";
import {
  Send,
  Bot,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  RefreshCw,
  Loader2,
  Check,
  ExternalLink,
  User,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

interface TelegramToolsProps {
  onClose?: () => void;
}

function timeAgo(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes > 60) return `قبل ${Math.floor(minutes / 60)} ساعة`;
  if (minutes > 0) return `قبل ${minutes} دقيقة`;
  return "الآن";
}

export default function TelegramTools({ onClose }: TelegramToolsProps) {
  const { apiKeys, hasTelegram } = useApiKeys();
  const [activeTool, setActiveTool] = useState<"info" | "send" | "updates">("info");

  // Bot info
  const [botInfo, setBotInfo] = useState<any>(null);
  const [loadingInfo, setLoadingInfo] = useState(false);

  // Send message
  const [chatId, setChatId] = useState("");
  const [message, setMessage] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"text" | "photo" | "video">("text");
  const [parseMode, setParseMode] = useState<"HTML" | "Markdown" | "MarkdownV2">("HTML");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);

  // Updates
  const [updates, setUpdates] = useState<any[]>([]);
  const [loadingUpdates, setLoadingUpdates] = useState(false);

  const handleGetBotInfo = useCallback(async () => {
    if (!hasTelegram) return;
    setLoadingInfo(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bot-info",
          botToken: apiKeys.telegramBotToken,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBotInfo(data.bot);
      toast.success("تم جلب معلومات البوت");
    } catch (err: any) {
      toast.error(err.message || "فشل جلب معلومات البوت");
    } finally {
      setLoadingInfo(false);
    }
  }, [hasTelegram, apiKeys.telegramBotToken]);

  const handleSend = useCallback(async () => {
    if (!hasTelegram) return;
    if (!chatId.trim()) {
      toast.error("أدخل معرّف المحادثة (Chat ID)");
      return;
    }
    if (mediaType === "text" && !message.trim()) {
      toast.error("اكتب الرسالة");
      return;
    }
    if ((mediaType === "photo" || mediaType === "video") && !mediaUrl.trim()) {
      toast.error(`أدخل رابط ${mediaType === "photo" ? "الصورة" : "الفيديو"}`);
      return;
    }
    setSending(true);
    setSendResult(null);
    try {
      const action =
        mediaType === "text" ? "send-message" : mediaType === "photo" ? "send-photo" : "send-video";
      const body: any = {
        action,
        botToken: apiKeys.telegramBotToken,
        chatId: chatId.trim(),
        parseMode,
      };
      if (mediaType === "text") body.text = message;
      else {
        body.text = message; // caption
        body.photoUrl = mediaType === "photo" ? mediaUrl : undefined;
        body.videoUrl = mediaType === "video" ? mediaUrl : undefined;
      }

      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSendResult(data);
      toast.success("تم الإرسال بنجاح");
    } catch (err: any) {
      toast.error(err.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  }, [hasTelegram, chatId, message, mediaUrl, mediaType, parseMode, apiKeys.telegramBotToken]);

  const handleGetUpdates = useCallback(async () => {
    if (!hasTelegram) return;
    setLoadingUpdates(true);
    try {
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get-updates",
          botToken: apiKeys.telegramBotToken,
          limit: 30,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUpdates(data.updates || []);
      toast.success(`تم جلب ${data.count || 0} تحديث`);
    } catch (err: any) {
      toast.error(err.message || "فشل جلب التحديثات");
    } finally {
      setLoadingUpdates(false);
    }
  }, [hasTelegram, apiKeys.telegramBotToken]);

  if (!hasTelegram) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <Bot className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <h3 className="text-sm font-semibold mb-1">Telegram Bot غير مُفعّل</h3>
        <p className="text-xs text-muted-foreground max-w-xs">
          أضف Bot Token من زر "المفاتيح" في الأعلى لتفعيل أدوات الإرسال والتحديثات ومعلومات البوت.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tool tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <button
          onClick={() => {
            setActiveTool("info");
            if (!botInfo) handleGetBotInfo();
          }}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "info"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          معلومات البوت
        </button>
        <button
          onClick={() => setActiveTool("send")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "send"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          إرسال رسالة
        </button>
        <button
          onClick={() => {
            setActiveTool("updates");
            handleGetUpdates();
          }}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "updates"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          آخر الرسائل
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Bot Info Tool */}
          {activeTool === "info" && (
            <div className="space-y-3">
              <Button
                onClick={handleGetBotInfo}
                disabled={loadingInfo}
                size="sm"
                className="w-full"
              >
                {loadingInfo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 ml-1" />
                )}
                تحديث معلومات البوت
              </Button>

              {botInfo && (
                <div className="rounded-md border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center gap-2 pb-2 border-b border-border">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{botInfo.firstName}</div>
                      <div className="text-xs text-muted-foreground">@{botInfo.username}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 text-xs">
                    <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                      <span className="text-muted-foreground">Bot ID:</span>
                      <span className="font-mono">{botInfo.id}</span>
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                      <span className="text-muted-foreground">انضمام للمجموعات:</span>
                      {botInfo.canJoinGroups ? (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 h-4">
                          <Check className="h-2.5 w-2.5 text-primary" />
                          نعم
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">لا</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                      <span className="text-muted-foreground">قراءة كل الرسائل:</span>
                      {botInfo.canReadAllGroupMessages ? (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 h-4">
                          <Check className="h-2.5 w-2.5 text-primary" />
                          نعم
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">لا</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between p-1.5 rounded bg-muted/30">
                      <span className="text-muted-foreground">دعم Inline:</span>
                      {botInfo.supportsInlineQueries ? (
                        <Badge variant="secondary" className="text-[10px] gap-0.5 h-4">
                          <Check className="h-2.5 w-2.5 text-primary" />
                          نعم
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4">لا</Badge>
                      )}
                    </div>
                  </div>
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    فتح البوت في تلجرام
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Send Message Tool */}
          {activeTool === "send" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">نوع الرسالة</Label>
                <Select
                  value={mediaType}
                  onValueChange={(v) => setMediaType(v as any)}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="text-xs">
                      <MessageSquare className="h-3.5 w-3.5 inline ml-1" />
                      نص فقط
                    </SelectItem>
                    <SelectItem value="photo" className="text-xs">
                      <ImageIcon className="h-3.5 w-3.5 inline ml-1" />
                      صورة + caption
                    </SelectItem>
                    <SelectItem value="video" className="text-xs">
                      <VideoIcon className="h-3.5 w-3.5 inline ml-1" />
                      فيديو + caption
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Chat ID (المحادثة المستهدفة)</Label>
                <Input
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder="-1001234567890 أو @username"
                  className="text-xs h-8"
                  dir="ltr"
                />
                <p className="text-[10px] text-muted-foreground">
                  للحصول على Chat ID: أرسل رسالة للبوت ثم استخدم أداة "آخر الرسائل"
                </p>
              </div>

              {mediaType !== "text" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    رابط {mediaType === "photo" ? "الصورة" : "الفيديو"}
                  </Label>
                  <Input
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="text-xs h-8"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">
                  {mediaType === "text" ? "نص الرسالة" : "Caption"}
                </Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="اكتب رسالتك هنا... (يدعم HTML)"
                  className="text-xs min-h-[80px]"
                />
                <Select value={parseMode} onValueChange={(v) => setParseMode(v as any)}>
                  <SelectTrigger className="text-xs h-7 w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HTML" className="text-xs">HTML</SelectItem>
                    <SelectItem value="Markdown" className="text-xs">Markdown</SelectItem>
                    <SelectItem value="MarkdownV2" className="text-xs">MarkdownV2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSend}
                disabled={sending}
                size="sm"
                className="w-full"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                ) : (
                  <Send className="h-3.5 w-3.5 ml-1" />
                )}
                إرسال
              </Button>

              {sendResult && (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-primary font-medium">
                    <Check className="h-3.5 w-3.5" />
                    تم الإرسال بنجاح
                  </div>
                  <div className="text-muted-foreground">
                    Message ID: <span className="font-mono">{sendResult.messageId}</span>
                  </div>
                  {sendResult.chat && (
                    <div className="text-muted-foreground">
                      المحادثة: {sendResult.chat.title || sendResult.chat.username || sendResult.chat.id}
                      <Badge variant="outline" className="text-[9px] ms-1 h-3.5">
                        {sendResult.chat.type}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Updates Tool */}
          {activeTool === "updates" && (
            <div className="space-y-3">
              <Button
                onClick={handleGetUpdates}
                disabled={loadingUpdates}
                size="sm"
                variant="outline"
                className="w-full"
              >
                {loadingUpdates ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 ml-1" />
                )}
                تحديث القائمة
              </Button>

              {updates.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  لا توجد رسائل. أرسل رسالة للبوت ثم حدّث.
                </div>
              ) : (
                <div className="space-y-2">
                  {updates.map((u, i) => (
                    <div
                      key={i}
                      className="rounded-md border border-border bg-card p-2 space-y-1"
                    >
                      {u.message ? (
                        <>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {u.message.from?.firstName || u.message.from?.username || "مستخدم"}
                              <Badge variant="outline" className="text-[9px] h-3.5 ms-1">
                                {u.message.chat.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(u.message.date)}
                            </div>
                          </div>
                          <div className="text-xs font-mono ltr-text bg-muted/30 p-1.5 rounded">
                            {u.message.text || "[رسالة وسائط]"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono ltr-text">
                            Chat ID: {u.message.chat.id}
                          </div>
                        </>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">
                          تحديث #{u.updateId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
