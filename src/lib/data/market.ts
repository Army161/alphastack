import { mulberry32, hashSeed, clamp } from "@/lib/utils";
import { UNIVERSE, BY_SYMBOL, CYCLE, type Asset } from "./universe";
import { getLive, getLiveHistory, type LiveSnapshot } from "./live";
import { MODELLED, type Provenance } from "./providers/types";

export { UNIVERSE, BY_SYMBOL, CYCLE };
export type { Asset };

export type Candle = { t: string; o: number; h: number; l: number; c: number; v: number };

/* ------------------------------------------------------------------ */
/* MODEL — deterministic fallback                                      */
/* ------------------------------------------------------------------ */

/**
 * Seeded OHLC generator. Used when a live provider is unavailable, and as the
 * shape for assets the upstream does not cover. Anchored to `endPrice` so a
 * live spot price pulls the whole modelled path with it.
 */
export function generateSeries(symbol: string, days: number, endPrice: number): Candle[] {
  const asset = BY_SYMBOL[symbol] ?? UNIVERSE[0];
  const rand = mulberry32(hashSeed(`${symbol}|v3`));
  const out: Candle[] = [];

  const end = endPrice;
  const drawdownDepth = asset.tier === "core" ? 0.54 : asset.tier === "major" ? 0.66 : 0.78;
  const start = end * (1 + drawdownDepth * 0.9);
  const troughIdx = Math.floor(days * 0.78);
  const trough = end * (1 - (asset.tier === "core" ? 0.185 : 0.27));

  let prev = start;
  for (let i = 0; i < days; i++) {
    let base: number;
    if (i <= troughIdx) {
      const p = i / troughIdx;
      base = start + (trough - start) * Math.pow(p, 0.75);
    } else {
      const p = (i - troughIdx) / (days - 1 - troughIdx || 1);
      base = trough + (end - trough) * Math.pow(p, 0.85);
    }
    const volMult = asset.tier === "core" ? 0.022 : asset.tier === "major" ? 0.033 : 0.048;
    const shock = (rand() - 0.5) * 2 * volMult;
    let c = prev + (base - prev) * 0.55 + prev * shock;
    c = clamp(c, base * 0.82, base * 1.18);

    const o = prev;
    const h = Math.max(o, c) * (1 + rand() * volMult * 0.7);
    const l = Math.min(o, c) * (1 - rand() * volMult * 0.7);
    const v = asset.marketCap * (0.012 + rand() * 0.03);

    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - (days - 1 - i));

    out.push({
      t: d.toISOString().slice(0, 10),
      o: round(o, endPrice),
      h: round(h, endPrice),
      l: round(l, endPrice),
      c: round(c, endPrice),
      v: Math.round(v),
    });
    prev = c;
  }
  out[out.length - 1].c = endPrice;
  return out;
}

function round(n: number, ref: number) {
  if (ref >= 1000) return Math.round(n);
  if (ref >= 10) return Math.round(n * 100) / 100;
  return Math.round(n * 10000) / 10000;
}

/** Derive OHLC from a live close-only series so charts and models agree. */
function candlesFromCloses(
  symbol: string,
  rows: { t: string; c: number; v: number }[]
): Candle[] {
  const rand = mulberry32(hashSeed(`${symbol}|ohlc`));
  return rows.map((r, i) => {
    const prev = i > 0 ? rows[i - 1].c : r.c;
    const hi = Math.max(prev, r.c);
    const lo = Math.min(prev, r.c);
    // Intraday range beyond the close-to-close move, scaled to the asset's move.
    const pad = Math.abs(r.c - prev) * 0.35 + r.c * 0.004 * rand();
    return {
      t: r.t,
      o: round(prev, r.c),
      h: round(hi + pad, r.c),
      l: round(Math.max(0, lo - pad), r.c),
      c: round(r.c, r.c),
      v: Math.round(r.v),
    };
  });
}

/* ------------------------------------------------------------------ */
/* PUBLIC API — live-first, model-fallback                             */
/* ------------------------------------------------------------------ */

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  change7d: number;
  change30d: number;
  marketCap: number;
  volume24h: number;
  tier: Asset["tier"];
  category: string;
  drawdownFromAth: number;
  source: "live" | "model";
  prov: Provenance;
};

export type MarketContext = {
  live: LiveSnapshot;
  quotes: Record<string, Quote>;
  series: Record<string, Candle[]>;
  seriesProv: Record<string, Provenance>;
};

/**
 * Builds the per-request market context. Fetches the shared live snapshot once,
 * then resolves history for the symbols requested. Everything underneath is
 * TTL-cached, so repeated calls inside one render are effectively free.
 */
/**
 * Live history is the expensive call — one request per asset against a
 * rate-limited free tier. Fetching it for the whole universe on every render
 * would trip the limiter and take prices down with it. So history is fetched
 * only for focused views (a handful of symbols); broader views get model
 * series anchored to the LIVE price, and say so via per-symbol provenance.
 */
const MAX_LIVE_HISTORY_SYMBOLS = 3;

export async function getMarketContext(
  symbols?: string[],
  opts: { history?: boolean } = {}
): Promise<MarketContext> {
  const live = await getLive();
  const wanted = symbols ?? UNIVERSE.map((a) => a.symbol);
  const wantHistory = opts.history ?? wanted.length <= MAX_LIVE_HISTORY_SYMBOLS;

  const series: Record<string, Candle[]> = {};
  const seriesProv: Record<string, Provenance> = {};

  await Promise.all(
    wanted.map(async (symbol) => {
      const asset = BY_SYMBOL[symbol];
      if (!asset) return;
      const livePrice = live.quotes[symbol]?.price;
      const endPrice = livePrice ?? asset.anchorPrice;

      // A cached history hit is free, so always try — the limiter short-circuits
      // when we are cooling down, and we only pay for a fetch on focused views.
      const hist = wantHistory ? await getLiveHistory(symbol, 365).catch(() => null) : null;

      if (hist && hist.candles.length >= 60) {
        series[symbol] = candlesFromCloses(symbol, hist.candles);
        seriesProv[symbol] = hist.prov;
      } else {
        series[symbol] = generateSeries(symbol, 365, endPrice);
        seriesProv[symbol] = livePrice
          ? {
              source: "model",
              fetchedAt: null,
              stale: false,
              note: "Live spot price; historical path modelled",
            }
          : MODELLED;
      }
    })
  );

  const quotes: Record<string, Quote> = {};
  for (const symbol of wanted) {
    const asset = BY_SYMBOL[symbol];
    if (!asset) continue;
    quotes[symbol] = buildQuote(asset, series[symbol], live, seriesProv[symbol]);
  }

  return { live, quotes, series, seriesProv };
}

function buildQuote(
  asset: Asset,
  s: Candle[],
  live: LiveSnapshot,
  seriesProv: Provenance
): Quote {
  const liveQ = live.quotes[asset.symbol];
  const last = liveQ?.price ?? s[s.length - 1].c;
  const back = (n: number) => s[Math.max(0, s.length - 1 - n)].c;
  const ath = Math.max(...s.map((c) => c.h));

  const isLive = Boolean(liveQ);
  return {
    symbol: asset.symbol,
    name: asset.name,
    price: last,
    change24h: liveQ?.change24h ?? ((last - back(1)) / back(1)) * 100,
    change7d: ((last - back(7)) / back(7)) * 100,
    change30d: ((last - back(30)) / back(30)) * 100,
    marketCap: liveQ?.marketCap || asset.marketCap,
    volume24h: liveQ?.volume24h || s[s.length - 1].v,
    tier: asset.tier,
    category: asset.category,
    drawdownFromAth: ((last - ath) / ath) * 100,
    source: isLive ? "live" : "model",
    prov: isLive ? live.quotesProv : seriesProv,
  };
}

/* ---------------------------- convenience single-symbol accessors --- */

export async function getQuote(symbol: string): Promise<Quote> {
  const ctx = await getMarketContext([symbol]);
  return ctx.quotes[symbol];
}

export async function getAllQuotes(): Promise<Quote[]> {
  const ctx = await getMarketContext();
  return UNIVERSE.map((a) => ctx.quotes[a.symbol]).filter(Boolean);
}

export async function getSeries(symbol: string, days = 365): Promise<Candle[]> {
  const ctx = await getMarketContext([symbol]);
  return ctx.series[symbol].slice(-days);
}
