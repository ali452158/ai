"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp,
  Search,
  Activity,
  ArrowUp,
  ArrowDown,
  Loader2,
  RefreshCw,
  DollarSign,
  CandlestickChart,
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

const INTERVALS = [
  { value: "1m", label: "1 دقيقة" },
  { value: "5m", label: "5 دقائق" },
  { value: "15m", label: "15 دقيقة" },
  { value: "1h", label: "1 ساعة" },
  { value: "4h", label: "4 ساعات" },
  { value: "1d", label: "1 يوم" },
  { value: "1w", label: "1 أسبوع" },
];

function formatNum(n: number, decimals = 2): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(2) + "K";
  return n.toFixed(decimals);
}

export default function BinanceTools() {
  const { apiKeys, hasBinance } = useApiKeys();
  const [activeTool, setActiveTool] = useState<"ticker" | "movers" | "klines">("ticker");

  // Ticker
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [tickerData, setTickerData] = useState<any>(null);
  const [loadingTicker, setLoadingTicker] = useState(false);

  // Movers
  const [moversData, setMoversData] = useState<any>(null);
  const [loadingMovers, setLoadingMovers] = useState(false);

  // Klines
  const [klineSymbol, setKlineSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1h");
  const [klinesData, setKlinesData] = useState<any[]>([]);
  const [loadingKlines, setLoadingKlines] = useState(false);

  const handleTicker = useCallback(async () => {
    if (!symbol.trim()) {
      toast.error("أدخل رمز الزوج (مثال: BTCUSDT)");
      return;
    }
    setLoadingTicker(true);
    try {
      const res = await fetch("/api/binance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ticker-24hr", symbol }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTickerData(data.ticker);
    } catch (err: any) {
      toast.error(err.message || "فشل جلب السعر");
    } finally {
      setLoadingTicker(false);
    }
  }, [symbol]);

  const handleMovers = useCallback(async () => {
    setLoadingMovers(true);
    try {
      const res = await fetch("/api/binance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ticker-24hr" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMoversData(data);
    } catch (err: any) {
      toast.error(err.message || "فشل جلب المُتقدّمين");
    } finally {
      setLoadingMovers(false);
    }
  }, []);

  const handleKlines = useCallback(async () => {
    if (!klineSymbol.trim()) {
      toast.error("أدخل رمز الزوج");
      return;
    }
    setLoadingKlines(true);
    try {
      const res = await fetch("/api/binance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "klines",
          symbol: klineSymbol,
          interval,
          limit: 50,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKlinesData(data.klines || []);
    } catch (err: any) {
      toast.error(err.message || "فشل جلب الشموع");
    } finally {
      setLoadingKlines(false);
    }
  }, [klineSymbol, interval]);

  return (
    <div className="flex h-full flex-col">
      {/* Tool tabs */}
      <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-2 py-1.5">
        <button
          onClick={() => setActiveTool("ticker")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "ticker"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          سعر الزوج
        </button>
        <button
          onClick={() => {
            setActiveTool("movers");
            if (!moversData) handleMovers();
          }}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "movers"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          الرابحون/الخاسرون
        </button>
        <button
          onClick={() => setActiveTool("klines")}
          className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            activeTool === "klines"
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CandlestickChart className="h-3.5 w-3.5" />
          الشموع اليابانية
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-3">
          {/* Ticker Tool */}
          {activeTool === "ticker" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">رمز الزوج (Pair)</Label>
                <div className="flex gap-1.5">
                  <Input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleTicker()}
                    placeholder="BTCUSDT, ETHUSDT, BNBUSDT..."
                    className="text-xs h-8 font-mono"
                    dir="ltr"
                    disabled={loadingTicker}
                  />
                  <Button
                    onClick={handleTicker}
                    size="sm"
                    disabled={loadingTicker}
                    className="h-8 px-2"
                  >
                    {loadingTicker ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  البيانات من Binance (24 ساعة) - بدون مفتاح API
                </p>
              </div>

              {tickerData && (
                <div className="rounded-md border border-border bg-card p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="font-bold text-sm">{tickerData.symbol}</span>
                    </div>
                    <Badge
                      variant={parseFloat(tickerData.priceChangePercent) >= 0 ? "default" : "destructive"}
                      className="gap-1"
                    >
                      {parseFloat(tickerData.priceChangePercent) >= 0 ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )}
                      {parseFloat(tickerData.priceChangePercent).toFixed(2)}%
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">آخر سعر</div>
                      <div className="font-mono font-bold">${parseFloat(tickerData.lastPrice).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">التغيّر</div>
                      <div className={`font-mono font-bold ${parseFloat(tickerData.priceChange) >= 0 ? "text-primary" : "text-destructive"}`}>
                        {parseFloat(tickerData.priceChange) >= 0 ? "+" : ""}
                        {parseFloat(tickerData.priceChange).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">أعلى 24س</div>
                      <div className="font-mono">${parseFloat(tickerData.highPrice).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">أدنى 24س</div>
                      <div className="font-mono">${parseFloat(tickerData.lowPrice).toFixed(2)}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">حجم التداول</div>
                      <div className="font-mono">{formatNum(parseFloat(tickerData.volume))} {tickerData.symbol.replace("USDT", "")}</div>
                    </div>
                    <div className="p-2 rounded bg-muted/30">
                      <div className="text-[10px] text-muted-foreground">القيمة (USDT)</div>
                      <div className="font-mono">${formatNum(parseFloat(tickerData.quoteVolume))}</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    عدد الصفقات: {formatNum(parseInt(tickerData.count), 0)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Movers Tool */}
          {activeTool === "movers" && (
            <div className="space-y-3">
              <Button
                onClick={handleMovers}
                disabled={loadingMovers}
                size="sm"
                variant="outline"
                className="w-full"
              >
                {loadingMovers ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 ml-1" />
                )}
                تحديث الرابحين والخاسرين
              </Button>

              {moversData && (
                <>
                  <div>
                    <div className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
                      <ArrowUp className="h-3 w-3" />
                      أعلى 10 رابحين
                    </div>
                    <div className="space-y-1">
                      {(moversData.topGainers || []).slice(0, 10).map((m: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded bg-card border border-border p-1.5 text-xs"
                        >
                          <span className="font-mono font-medium">{m.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">${parseFloat(m.lastPrice).toFixed(4)}</span>
                            <Badge variant="default" className="text-[10px] gap-0.5 h-4">
                              <ArrowUp className="h-2.5 w-2.5" />
                              {parseFloat(m.priceChangePercent).toFixed(2)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-destructive mb-1.5 flex items-center gap-1">
                      <ArrowDown className="h-3 w-3" />
                      أعلى 10 خاسرين
                    </div>
                    <div className="space-y-1">
                      {(moversData.topLosers || []).slice(0, 10).map((m: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded bg-card border border-border p-1.5 text-xs"
                        >
                          <span className="font-mono font-medium">{m.symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">${parseFloat(m.lastPrice).toFixed(4)}</span>
                            <Badge variant="destructive" className="text-[10px] gap-0.5 h-4">
                              <ArrowDown className="h-2.5 w-2.5" />
                              {parseFloat(m.priceChangePercent).toFixed(2)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Klines Tool */}
          {activeTool === "klines" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">رمز الزوج</Label>
                <Input
                  value={klineSymbol}
                  onChange={(e) => setKlineSymbol(e.target.value.toUpperCase())}
                  placeholder="BTCUSDT"
                  className="text-xs h-8 font-mono"
                  dir="ltr"
                  disabled={loadingKlines}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">الإطار الزمني</Label>
                <Select value={interval} onValueChange={setInterval}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVALS.map((iv) => (
                      <SelectItem key={iv.value} value={iv.value} className="text-xs">
                        {iv.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleKlines}
                disabled={loadingKlines}
                size="sm"
                className="w-full"
              >
                {loadingKlines ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" />
                ) : (
                  <CandlestickChart className="h-3.5 w-3.5 ml-1" />
                )}
                جلب الشموع (آخر 50)
              </Button>

              {klinesData.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    {klineSymbol} - {INTERVALS.find((i) => i.value === interval)?.label}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-mono">
                      <thead>
                        <tr className="border-b border-border text-muted-foreground">
                          <th className="text-right p-1">الوقت</th>
                          <th className="text-right p-1">افتتاح</th>
                          <th className="text-right p-1">أعلى</th>
                          <th className="text-right p-1">أدنى</th>
                          <th className="text-right p-1">إغلاق</th>
                          <th className="text-right p-1">حجم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {klinesData.slice(-15).map((k, i) => {
                          const isUp = k.close >= k.open;
                          return (
                            <tr key={i} className="border-b border-border/50">
                              <td className="p-1 text-muted-foreground">
                                {new Date(k.openTime).toLocaleString("ar-EG", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="p-1">{k.open.toFixed(2)}</td>
                              <td className="p-1 text-primary">{k.high.toFixed(2)}</td>
                              <td className="p-1 text-destructive">{k.low.toFixed(2)}</td>
                              <td className={`p-1 font-bold ${isUp ? "text-primary" : "text-destructive"}`}>
                                {k.close.toFixed(2)}
                              </td>
                              <td className="p-1 text-muted-foreground">{formatNum(k.volume)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[10px] text-muted-foreground text-center pt-1">
                    عرض آخر 15 شمعة من أصل {klinesData.length}
                  </div>
                </div>
              )}

              {hasBinance && (
                <div className="rounded-md bg-primary/5 border border-primary/30 p-2 text-[10px] text-muted-foreground">
                  💡 لديك مفاتيح Binance محفوظة - يمكنك الوصول لمعاملاتك الخاصة من خلال مساعد الذكاء الاصطناعي.
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
