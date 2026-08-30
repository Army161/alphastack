import { cached, fetchJson, type Cached } from "../cache";

/**
 * Derivatives data — open interest, funding and positioning skew.
 *
 * Two independent keyless sources, both reachable where Binance and Bybit are
 * geo-blocked:
 *   OKX          — deep coverage of the majors, plus a long/short account ratio
 *   Hyperliquid  — native coverage of HYPE and a fully on-chain funding feed
 *
 * Whichever answers first for a symbol wins; the other is the fallback.
 */

export type DerivSnapshot = {
  symbol: string;
  /** Open interest ON THIS VENUE — not market-wide. */
  openInterestUsd: number;
  /** Market-wide OI estimated by grossing up for the venue's share. */
  estimatedGlobalOiUsd: number;
  venueCoverage: number;
  fundingRate: number;
  /** Funding annualised assuming 3 settlements per day. */
  fundingApr: number;
  longShortRatio: number | null;
  markPrice: number | null;
  venue: "okx" | "hyperliquid";
};

/**
 * Approximate share of global perpetual open interest carried by each venue,
 * used to gross a single-venue reading up to a market-wide estimate.
 */
const VENUE_COVERAGE: Record<DerivSnapshot["venue"], number> = {
  okx: 0.075,
  hyperliquid: 0.05,
};

/**
 * Assets whose primary (or only) perp market IS this venue. Grossing these up
 * would invent open interest that does not exist anywhere — HYPE on
 * Hyperliquid is essentially the whole market, not 5% of it.
 */
const NATIVE_TO_VENUE: Record<string, DerivSnapshot["venue"]> = {
  HYPE: "hyperliquid",
};

function withGlobalEstimate(
  s: Omit<DerivSnapshot, "estimatedGlobalOiUsd" | "venueCoverage">
): DerivSnapshot {
  const isNative = NATIVE_TO_VENUE[s.symbol] === s.venue;
  const coverage = isNative ? 0.85 : VENUE_COVERAGE[s.venue];
  return {
    ...s,
    venueCoverage: coverage,
    estimatedGlobalOiUsd: s.openInterestUsd / coverage,
  };
}

/* ----------------------------------------------------------------- OKX */

const OKX = "https://www.okx.com/api/v5";

const OKX_INST: Record<string, string> = {
  BTC: "BTC-USDT-SWAP",
  ETH: "ETH-USDT-SWAP",
  SOL: "SOL-USDT-SWAP",
  XRP: "XRP-USDT-SWAP",
  BNB: "BNB-USDT-SWAP",
  ADA: "ADA-USDT-SWAP",
  AVAX: "AVAX-USDT-SWAP",
  SUI: "SUI-USDT-SWAP",
  NEAR: "NEAR-USDT-SWAP",
  TAO: "TAO-USDT-SWAP",
};

type OkxEnvelope<T> = { code: string; msg: string; data: T };

async function okxOpenInterest(instId: string) {
  const json = await fetchJson<OkxEnvelope<{ oiUsd: string; oiCcy: string }[]>>(
    `${OKX}/public/open-interest?instType=SWAP&instId=${instId}`
  );
  const row = json.data?.[0];
  if (!row) throw new Error(`OKX has no open interest for ${instId}`);
  return Number(row.oiUsd);
}

async function okxFunding(instId: string) {
  const json = await fetchJson<OkxEnvelope<{ fundingRate: string }[]>>(
    `${OKX}/public/funding-rate?instId=${instId}`
  );
  const row = json.data?.[0];
  if (!row) throw new Error(`OKX has no funding for ${instId}`);
  return Number(row.fundingRate);
}

async function okxLongShort(ccy: string): Promise<number | null> {
  try {
    const json = await fetchJson<OkxEnvelope<[string, string][]>>(
      `${OKX}/rubik/stat/contracts/long-short-account-ratio?ccy=${ccy}&period=5m`
    );
    const latest = json.data?.[0];
    return latest ? Number(latest[1]) : null;
  } catch {
    return null; // Positioning skew is a nice-to-have, never a hard failure.
  }
}

async function okxMark(instId: string): Promise<number | null> {
  try {
    const json = await fetchJson<OkxEnvelope<{ markPx: string }[]>>(
      `${OKX}/public/mark-price?instType=SWAP&instId=${instId}`
    );
    return json.data?.[0] ? Number(json.data[0].markPx) : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------- Hyperliquid */

type HlAssetCtx = {
  funding: string;
  openInterest: string;
  oraclePx: string;
  markPx: string;
};

type HlMetaAndCtxs = [{ universe: { name: string }[] }, HlAssetCtx[]];

async function hyperliquidAll(): Promise<Cached<Record<string, DerivSnapshot>> | null> {
  return cached("hl:ctxs", 90_000, async () => {
    const json = await fetchJson<HlMetaAndCtxs>("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
      timeoutMs: 9000,
    });
    const [meta, ctxs] = json;
    const out: Record<string, DerivSnapshot> = {};
    meta.universe.forEach((asset, i) => {
      const ctx = ctxs[i];
      if (!ctx) return;
      const oracle = Number(ctx.oraclePx);
      const oiCoins = Number(ctx.openInterest);
      const funding = Number(ctx.funding); // hourly on Hyperliquid
      if (!Number.isFinite(oracle) || !Number.isFinite(oiCoins)) return;
      out[asset.name] = withGlobalEstimate({
        symbol: asset.name,
        openInterestUsd: oiCoins * oracle,
        fundingRate: funding * 8, // normalise to an 8h-equivalent rate
        fundingApr: funding * 24 * 365 * 100,
        longShortRatio: null,
        markPrice: Number(ctx.markPx) || oracle,
        venue: "hyperliquid",
      });
    });
    if (!Object.keys(out).length) throw new Error("Hyperliquid returned no asset contexts");
    return out;
  });
}

/* ------------------------------------------------------------ combined */

export async function fetchDerivatives(
  symbol: string
): Promise<Cached<DerivSnapshot> | null> {
  const inst = OKX_INST[symbol];

  if (inst) {
    const viaOkx = await cached(`okx:deriv:${symbol}`, 120_000, async () => {
      const [oi, funding, ls, mark] = await Promise.all([
        okxOpenInterest(inst),
        okxFunding(inst),
        okxLongShort(symbol),
        okxMark(inst),
      ]);
      return withGlobalEstimate({
        symbol,
        openInterestUsd: oi,
        fundingRate: funding,
        fundingApr: funding * 3 * 365 * 100,
        longShortRatio: ls,
        markPrice: mark,
        venue: "okx" as const,
      });
    });
    if (viaOkx) return viaOkx;
  }

  // Hyperliquid covers everything OKX misses — notably HYPE itself.
  const hl = await hyperliquidAll();
  if (hl?.value[symbol]) {
    return { value: hl.value[symbol], fresh: hl.fresh, ageMs: hl.ageMs, error: hl.error };
  }
  return null;
}

export async function pingOkx() {
  const t0 = Date.now();
  try {
    await fetchJson(`${OKX}/public/time`, { timeoutMs: 6000 });
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export async function pingHyperliquid() {
  const t0 = Date.now();
  try {
    await fetchJson("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "meta" }),
      timeoutMs: 6000,
    });
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

/* ---------------------------------------------------- Coinglass (paid) */

export type LiquidationSnapshot = {
  total24h: number;
  longs24h: number;
  shorts24h: number;
};

/** Optional — only wired when COINGLASS_API_KEY is present. */
export async function fetchLiquidations(
  symbol: string
): Promise<Cached<LiquidationSnapshot> | null> {
  const key = process.env.COINGLASS_API_KEY;
  if (!key) return null;
  return cached(`cg-liq:${symbol}`, 5 * 60_000, async () => {
    const json = await fetchJson<{
      data?: { longLiquidationUsd?: number; shortLiquidationUsd?: number }[];
    }>(
      `https://open-api-v3.coinglass.com/api/futures/liquidation/v2/history?symbol=${symbol}&interval=1d&limit=1`,
      { headers: { "CG-API-KEY": key }, timeoutMs: 9000 }
    );
    const row = json.data?.[0];
    if (!row) throw new Error("Coinglass returned no liquidation rows");
    const longs = row.longLiquidationUsd ?? 0;
    const shorts = row.shortLiquidationUsd ?? 0;
    return { total24h: longs + shorts, longs24h: longs, shorts24h: shorts };
  });
}
