import { UNIVERSE } from "./universe";
import { fetchQuotes, fetchHistory, fetchGlobal, type CgQuote } from "./providers/coingecko";
import { fetchDerivatives, fetchLiquidations, type DerivSnapshot, type LiquidationSnapshot } from "./providers/derivatives";
import { fetchRates, fetchSentiment, fetchTvl, type RatesSnapshot, type SentimentSnapshot } from "./providers/macro";
import { MODELLED, liveProv, type Provenance } from "./providers/types";

/**
 * The live layer.
 *
 * Every module engine reads from a LiveSnapshot. Each field degrades
 * independently: if OKX is unreachable, prices are still live from CoinGecko
 * and only the derivatives block falls back to the model. Nothing ever throws
 * upward — a dead upstream produces a modelled value and a provenance record
 * saying so.
 */

export type LiveSnapshot = {
  enabled: boolean;
  at: number;
  quotes: Record<string, CgQuote>;
  quotesProv: Provenance;
  global: { totalMarketCap: number; btcDominance: number } | null;
  globalProv: Provenance;
  rates: RatesSnapshot | null;
  ratesProv: Provenance;
  sentiment: SentimentSnapshot | null;
  sentimentProv: Provenance;
  tvl: Record<string, number> | null;
  tvlProv: Provenance;
};

export function liveEnabled() {
  // Live by default — every core provider is keyless. Set ENABLE_LIVE_DATA=0
  // to pin the platform to the deterministic model.
  return process.env.ENABLE_LIVE_DATA !== "0";
}

const EMPTY: LiveSnapshot = {
  enabled: false,
  at: 0,
  quotes: {},
  quotesProv: MODELLED,
  global: null,
  globalProv: MODELLED,
  rates: null,
  ratesProv: MODELLED,
  sentiment: null,
  sentimentProv: MODELLED,
  tvl: null,
  tvlProv: MODELLED,
};

/**
 * Assembles the shared snapshot. All five upstreams run concurrently and are
 * individually cached, so a page render costs at most one round of fetches and
 * usually zero.
 */
export async function getLive(): Promise<LiveSnapshot> {
  if (!liveEnabled()) return EMPTY;

  const ids = UNIVERSE.map((a) => a.coingeckoId);
  const [q, g, r, s, t] = await Promise.all([
    fetchQuotes(ids).catch(() => null),
    fetchGlobal().catch(() => null),
    fetchRates().catch(() => null),
    fetchSentiment().catch(() => null),
    fetchTvl().catch(() => null),
  ]);

  // Re-key CoinGecko ids onto our ticker symbols.
  const quotes: Record<string, CgQuote> = {};
  if (q) {
    for (const a of UNIVERSE) {
      const row = q.value[a.coingeckoId];
      if (row) quotes[a.symbol] = row;
    }
  }

  return {
    enabled: true,
    at: Date.now(),
    quotes,
    quotesProv: q ? liveProv("coingecko", Date.now() - q.ageMs, !q.fresh) : MODELLED,
    global: g ? { totalMarketCap: g.value.totalMarketCap, btcDominance: g.value.btcDominance } : null,
    globalProv: g ? liveProv("coingecko", Date.now() - g.ageMs, !g.fresh) : MODELLED,
    rates: r?.value ?? null,
    ratesProv: r ? liveProv("fred", Date.now() - r.ageMs, !r.fresh) : MODELLED,
    sentiment: s?.value ?? null,
    sentimentProv: s ? liveProv("alternative.me", Date.now() - s.ageMs, !s.fresh) : MODELLED,
    tvl: t?.value ?? null,
    tvlProv: t ? liveProv("defillama", Date.now() - t.ageMs, !t.fresh) : MODELLED,
  };
}

/* ------------------------------------------------------- price history */

export type LiveHistory = { candles: { t: string; c: number; v: number }[]; prov: Provenance };

export async function getLiveHistory(symbol: string, days = 365): Promise<LiveHistory | null> {
  if (!liveEnabled()) return null;
  const asset = UNIVERSE.find((a) => a.symbol === symbol);
  if (!asset) return null;
  const h = await fetchHistory(asset.coingeckoId, days).catch(() => null);
  if (!h || h.value.length < 30) return null;
  return {
    candles: h.value,
    prov: liveProv("coingecko", Date.now() - h.ageMs, !h.fresh),
  };
}

/* --------------------------------------------------------- derivatives */

export type LiveDerivatives = {
  deriv: DerivSnapshot | null;
  derivProv: Provenance;
  liquidations: LiquidationSnapshot | null;
  liquidationsProv: Provenance;
};

export async function getLiveDerivatives(symbol: string): Promise<LiveDerivatives> {
  if (!liveEnabled()) {
    return { deriv: null, derivProv: MODELLED, liquidations: null, liquidationsProv: MODELLED };
  }
  const [d, l] = await Promise.all([
    fetchDerivatives(symbol).catch(() => null),
    fetchLiquidations(symbol).catch(() => null),
  ]);
  return {
    deriv: d?.value ?? null,
    derivProv: d ? liveProv(d.value.venue, Date.now() - d.ageMs, !d.fresh) : MODELLED,
    liquidations: l?.value ?? null,
    liquidationsProv: l ? liveProv("coinglass", Date.now() - l.ageMs, !l.fresh) : MODELLED,
  };
}
