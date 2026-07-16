"use client";

import { useState } from "react";
import {
  Key,
  Youtube,
  Send,
  Check,
  X,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useApiKeys } from "@/hooks/use-api-keys";

interface ApiKeysDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApiKeysDialog({ open, onOpenChange }: ApiKeysDialogProps) {
  return open ? (
    <ApiKeysDialogContent
      onOpenChange={onOpenChange}
    />
  ) : null;
}

function ApiKeysDialogContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const { apiKeys, saveApiKey, clearApiKey } = useApiKeys();
  // Initialize state from the persisted keys on first mount of this content component.
  // The parent only renders this when `open` is true, so it remounts each time the dialog opens,
  // giving us fresh state synced to the latest saved values.
  const [youtubeKey, setYoutubeKey] = useState(apiKeys.youtubeApiKey);
  const [telegramToken, setTelegramToken] = useState(apiKeys.telegramBotToken);
  const [showYoutube, setShowYoutube] = useState(false);
  const [showTelegram, setShowTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState("youtube");

  const handleSaveYoutube = () => {
    if (!youtubeKey.trim()) {
      toast.error("أدخل مفتاح API صحيح");
      return;
    }
    if (saveApiKey("youtube", youtubeKey.trim())) {
      toast.success("تم حفظ مفتاح YouTube API");
    } else {
      toast.error("تعذّر حفظ المفتاح");
    }
  };

  const handleSaveTelegram = () => {
    if (!telegramToken.trim()) {
      toast.error("أدخل توكن صحيح");
      return;
    }
    if (saveApiKey("telegram", telegramToken.trim())) {
      toast.success("تم حفظ توكن Telegram Bot");
    } else {
      toast.error("تعذّر حفظ التوكن");
    }
  };

  const handleClearYoutube = () => {
    clearApiKey("youtube");
    setYoutubeKey("");
    toast.success("تم حذف مفتاح YouTube API");
  };

  const handleClearTelegram = () => {
    clearApiKey("telegram");
    setTelegramToken("");
    toast.success("تم حذف توكن Telegram Bot");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            مفاتيح تكامل المنصات
          </DialogTitle>
          <DialogDescription>
            أدخل مفاتيح API لتشغيل التكامل الحقيقي مع YouTube و Telegram. تُحفظ المفاتيح محلياً في متصفحك فقط ولا تُرسل لأي خادم خارجي.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="youtube" className="gap-1.5">
              <Youtube className="h-3.5 w-3.5" />
              YouTube
              {apiKeys.youtubeApiKey && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="telegram" className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              Telegram
              {apiKeys.telegramBotToken && (
                <Check className="h-3 w-3 text-primary" />
              )}
            </TabsTrigger>
          </TabsList>

          {/* YouTube Tab */}
          <TabsContent value="youtube" className="space-y-4 mt-4">
            <div className="rounded-md bg-muted/30 p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                كيفية الحصول على مفتاح YouTube Data API v3:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  اذهب إلى{" "}
                  <a
                    href="https://console.cloud.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    Google Cloud Console
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </li>
                <li>أنشئ مشروعاً جديداً أو اختر مشروعاً موجوداً</li>
                <li>فعّل "YouTube Data API v3" من المكتبة</li>
                <li>أنشئ بيانات اعتماد (API Key) من Credentials</li>
                <li>انسخ المفتاح والصقه هنا</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube-key" className="text-xs">
                مفتاح YouTube Data API
              </Label>
              <div className="relative">
                <Input
                  id="youtube-key"
                  type={showYoutube ? "text" : "password"}
                  value={youtubeKey}
                  onChange={(e) => setYoutubeKey(e.target.value)}
                  placeholder="AIza..."
                  className="pr-10 font-mono text-xs"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowYoutube(!showYoutube)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="إظهار/إخفاء"
                >
                  {showYoutube ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {apiKeys.youtubeApiKey && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Check className="h-2.5 w-2.5 text-primary" />
                  محفوظ محلياً
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveYoutube} size="sm">
                حفظ المفتاح
              </Button>
              {apiKeys.youtubeApiKey && (
                <Button onClick={handleClearYoutube} variant="outline" size="sm">
                  <X className="h-3.5 w-3.5 ml-1" />
                  حذف
                </Button>
              )}
            </div>
          </TabsContent>

          {/* Telegram Tab */}
          <TabsContent value="telegram" className="space-y-4 mt-4">
            <div className="rounded-md bg-muted/30 p-3 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <Shield className="h-3.5 w-3.5 text-primary" />
                كيفية الحصول على Telegram Bot Token:
              </div>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>
                  افتح{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline inline-flex items-center gap-0.5"
                  >
                    @BotFather
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>{" "}
                  في تلجرام
                </li>
                <li>أرسل الأمر <code className="bg-muted px-1 rounded">/newbot</code></li>
                <li>اختر اسماً للبوت</li>
                <li>اختر username ينتهي بـ <code className="bg-muted px-1 rounded">bot</code></li>
                <li>انسخ التوكن المُعطى والصقه هنا</li>
              </ol>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram-token" className="text-xs">
                Telegram Bot Token
              </Label>
              <div className="relative">
                <Input
                  id="telegram-token"
                  type={showTelegram ? "text" : "password"}
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABC..."
                  className="pr-10 font-mono text-xs"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowTelegram(!showTelegram)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="إظهار/إخفاء"
                >
                  {showTelegram ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {apiKeys.telegramBotToken && (
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Check className="h-2.5 w-2.5 text-primary" />
                  محفوظ محلياً
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSaveTelegram} size="sm">
                حفظ التوكن
              </Button>
              {apiKeys.telegramBotToken && (
                <Button onClick={handleClearTelegram} variant="outline" size="sm">
                  <X className="h-3.5 w-3.5 ml-1" />
                  حذف
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
