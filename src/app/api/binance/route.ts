import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 30;

interface BinanceRequest {
  action:
    | "ticker"
    | "ticker-24hr"
    | "klines"
    | "orderbook"
    | "exchange-info"
    | "account"
    | "my-trades"
    | "place-order";
  symbol?: string;
  interval?: string; // 1m, 5m, 15m, 1h, 4h, 1d
  limit?: number;
  apiKey?: string;
  apiSecret?: string;
  side?: "BUY" | "SELL";
  type?: "MARKET" | "LIMIT";
  quantity?: string;
  price?: string;
}

const BINANCE_BASE = "https://api.binance.com";

function sign(query: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(query).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as BinanceRequest;

    if (!body.action) {
      return NextResponse.json({ error: "action مطلوب" }, { status: 400 });
    }

    switch (body.action) {
      case "ticker": {
        // Get current price for one or all symbols
        const url = body.symbol
          ? `${BINANCE_BASE}/api/v3/ticker/price?symbol=${encodeURIComponent(body.symbol.toUpperCase())}`
          : `${BINANCE_BASE}/api/v3/ticker/price`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب السعر" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          prices: Array.isArray(data) ? data : [data],
        });
      }

      case "ticker-24hr": {
        // 24-hour price change statistics
        const url = body.symbol
          ? `${BINANCE_BASE}/api/v3/ticker/24hr?symbol=${encodeURIComponent(body.symbol.toUpperCase())}`
          : `${BINANCE_BASE}/api/v3/ticker/24hr`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب إحصائيات 24 ساعة" },
            { status: res.status }
          );
        }
        if (Array.isArray(data)) {
          // Top gainers/losers
          const sorted = data
            .filter((d: any) => d.quoteVolume && parseFloat(d.quoteVolume) > 0)
            .sort(
              (a: any, b: any) =>
                parseFloat(b.priceChangePercent) - parseFloat(a.priceChangePercent)
            );
          return NextResponse.json({
            topGainers: sorted.slice(0, 10),
            topLosers: sorted.slice(-10).reverse(),
            count: sorted.length,
          });
        }
        return NextResponse.json({ ticker: data });
      }

      case "klines": {
        // Candlestick/klines data
        if (!body.symbol) {
          return NextResponse.json({ error: "symbol مطلوب" }, { status: 400 });
        }
        const interval = body.interval || "1h";
        const limit = Math.min(body.limit || 100, 1000);
        const url = `${BINANCE_BASE}/api/v3/klines?symbol=${encodeURIComponent(
          body.symbol.toUpperCase()
        )}&interval=${interval}&limit=${limit}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب الشموع اليابانية" },
            { status: res.status }
          );
        }
        const klines = (data as any[]).map((k) => ({
          openTime: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          closeTime: k[6],
          trades: k[8],
        }));
        return NextResponse.json({
          symbol: body.symbol.toUpperCase(),
          interval,
          klines,
        });
      }

      case "orderbook": {
        if (!body.symbol) {
          return NextResponse.json({ error: "symbol مطلوب" }, { status: 400 });
        }
        const limit = Math.min(body.limit || 100, 5000);
        const url = `${BINANCE_BASE}/api/v3/depth?symbol=${encodeURIComponent(
          body.symbol.toUpperCase()
        )}&limit=${limit}`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب الـ order book" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          bids: (data.bids || []).slice(0, 20).map((b: string[]) => ({
            price: parseFloat(b[0]),
            quantity: parseFloat(b[1]),
          })),
          asks: (data.asks || []).slice(0, 20).map((a: string[]) => ({
            price: parseFloat(a[0]),
            quantity: parseFloat(a[1]),
          })),
        });
      }

      case "exchange-info": {
        const url = `${BINANCE_BASE}/api/v3/exchangeInfo`;
        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: "فشل جلب معلومات البورصة" },
            { status: res.status }
          );
        }
        const symbols = (data.symbols || [])
          .filter((s: any) => s.status === "TRADING")
          .slice(0, 50)
          .map((s: any) => ({
            symbol: s.symbol,
            baseAsset: s.baseAsset,
            quoteAsset: s.quoteAsset,
            status: s.status,
          }));
        return NextResponse.json({
          symbols,
          total: data.symbols?.length || 0,
        });
      }

      // ===== Private endpoints (require API key + secret) =====
      case "account": {
        if (!body.apiKey || !body.apiSecret) {
          return NextResponse.json(
            { error: "apiKey و apiSecret مطلوبان للعمليات الخاصة" },
            { status: 400 }
          );
        }
        const timestamp = Date.now();
        const query = `timestamp=${timestamp}&recvWindow=60000`;
        const signature = sign(query, body.apiSecret);
        const url = `${BINANCE_BASE}/api/v3/account?${query}&signature=${signature}`;
        const res = await fetch(url, {
          headers: { "X-MBX-APIKEY": body.apiKey },
        });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب معلومات الحساب" },
            { status: res.status }
          );
        }
        const balances = (data.balances || [])
          .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
          .map((b: any) => ({
            asset: b.asset,
            free: parseFloat(b.free),
            locked: parseFloat(b.locked),
            total: parseFloat(b.free) + parseFloat(b.locked),
          }));
        return NextResponse.json({
          accountType: data.accountType,
          canTrade: data.canTrade,
          canDeposit: data.canDeposit,
          canWithdraw: data.canWithdraw,
          balances,
        });
      }

      case "my-trades": {
        if (!body.apiKey || !body.apiSecret) {
          return NextResponse.json(
            { error: "apiKey و apiSecret مطلوبان" },
            { status: 400 }
          );
        }
        if (!body.symbol) {
          return NextResponse.json({ error: "symbol مطلوب" }, { status: 400 });
        }
        const timestamp = Date.now();
        const limit = Math.min(body.limit || 50, 1000);
        const query = `symbol=${encodeURIComponent(
          body.symbol.toUpperCase()
        )}&timestamp=${timestamp}&recvWindow=60000&limit=${limit}`;
        const signature = sign(query, body.apiSecret);
        const url = `${BINANCE_BASE}/api/v3/myTrades?${query}&signature=${signature}`;
        const res = await fetch(url, {
          headers: { "X-MBX-APIKEY": body.apiKey },
        });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل جلب الصفقات" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          trades: (data || []).map((t: any) => ({
            id: t.id,
            orderId: t.orderId,
            symbol: t.symbol,
            type: t.isBuyer ? "BUY" : "SELL",
            price: parseFloat(t.price),
            qty: parseFloat(t.qty),
            quoteQty: parseFloat(t.quoteQty),
            commission: parseFloat(t.commission),
            commissionAsset: t.commissionAsset,
            time: new Date(t.time).toISOString(),
          })),
        });
      }

      case "place-order": {
        if (!body.apiKey || !body.apiSecret) {
          return NextResponse.json(
            { error: "apiKey و apiSecret مطلوبان" },
            { status: 400 }
          );
        }
        if (!body.symbol || !body.side || !body.type || !body.quantity) {
          return NextResponse.json(
            { error: "symbol, side, type, quantity مطلوبة" },
            { status: 400 }
          );
        }
        const timestamp = Date.now();
        const params: Record<string, string> = {
          symbol: body.symbol.toUpperCase(),
          side: body.side,
          type: body.type,
          quantity: body.quantity,
          timestamp: timestamp.toString(),
          recvWindow: "60000",
        };
        if (body.type === "LIMIT" && body.price) {
          params.price = body.price;
          params.timeInForce = "GTC";
        }
        const query = Object.entries(params)
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&");
        const signature = sign(query, body.apiSecret);
        const url = `${BINANCE_BASE}/api/v3/order?${query}&signature=${signature}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "X-MBX-APIKEY": body.apiKey },
        });
        const data = await res.json();
        if (!res.ok) {
          return NextResponse.json(
            { error: data.msg || "فشل إنشاء الأمر" },
            { status: res.status }
          );
        }
        return NextResponse.json({
          orderId: data.orderId,
          symbol: data.symbol,
          side: data.side,
          type: data.type,
          status: data.status,
          price: parseFloat(data.price),
          origQty: parseFloat(data.origQty),
          executedQty: parseFloat(data.executedQty),
          transactTime: new Date(data.transactTime).toISOString(),
        });
      }

      default:
        return NextResponse.json({ error: "action غير مدعوم" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[binance] Error:", err);
    return NextResponse.json(
      { error: `خطأ في Binance API: ${err?.message || "غير معروف"}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Binance API Integration",
    actions: ["ticker", "ticker-24hr", "klines", "orderbook", "exchange-info", "account", "my-trades", "place-order"],
    publicActions: ["ticker", "ticker-24hr", "klines", "orderbook", "exchange-info"],
    privateActions: ["account", "my-trades", "place-order"],
  });
}
