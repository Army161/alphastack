import {
  UNIVERSE, BY_SYMBOL, CYCLE, getMarketContext,
  type Quote, type MarketContext, type Candle,
} from "@/lib/data/market";
import { clamp, mulberry32, hashSeed } from "@/lib/utils";

/**
 * TERMINAL — AI-augmented screener + semantic data layer
 *
 * The screener's differentiator is the THESIS FIT score: every asset is graded
 * against the five explicit selection criteria from the framework, so the
 * screen answers "does this belong in the basket" rather than "did it pump".
 *
 * The semantic layer exposes a fixed set of typed query functions. The agent
 * calls these rather than writing free-form SQL, which is what makes answers
 * reproducible and citable.
 */

export const THESIS_CRITERIA = [
  { key: "etf", label: "ETF / institutional rail", weight: 25, why: "An ETF is the flow rail. Without it, institutional allocation has no compliant path in." },
  { key: "regClarity", label: "Regulatory clarity", weight: 25, why: "Ambiguous classification caps the buyer set regardless of technology quality." },
  { key: "govEngagement", label: "Policy engagement", weight: 20, why: "Leadership meeting with the White House, SEC and CFTC is a leading indicator of favourable classification." },
  { key: "realVolume", label: "Real volume & utility", weight: 20, why: "Revenue and organic volume, not narrative. Speculative-only chains did not survive the last rotation." },
  { key: "tooBigToFail", label: "Survivorship floor", weight: 10, why: "Market cap large enough that the project cannot quietly die from attention decay." },
] as const;

export type ScreenRow = Quote & {
  thesisFit: number;
  thesisGrade: string;
  criteria: { key: string; label: string; pass: boolean; weight: number }[];
  upside2030: number;
  target2030: number;
  volatility30d: number;
  liquidityScore: number;
  momentum: number;
  aiExposure: number;
  riskFlags: string[];
  verdict: string;
};

/** Return multiples from the framework: majors 5–10x, sub-top-20 15–50x. */
function target2030For(symbol: string, price: number, marketCap: number) {
  if (symbol === "BTC") return CYCLE.target2030;
  const rank = [...UNIVERSE].sort((a, b) => b.marketCap - a.marketCap).findIndex((a) => a.symbol === symbol);
  const mult = rank < 6 ? 7 : rank < 12 ? 14 : 22;
  return Math.round(price * mult * 100) / 100;
}

function volatility(series: Candle[]) {
  const s = series.slice(-30);
  if (s.length < 3) return 0;
  const rets = s.slice(1).map((c, i) => Math.log(c.c / s[i].c));
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const varr = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length;
  return Math.sqrt(varr) * Math.sqrt(365) * 100;
}

const AI_EXPOSURE: Record<string, number> = {
  TAO: 92, VVV: 88, AKT: 79, NEAR: 54, SOL: 31, ETH: 27,
  HYPE: 12, BTC: 6, XRP: 8, BNB: 14, ADA: 11, AVAX: 18, SUI: 21,
};

export async function screen(ctx?: MarketContext): Promise<ScreenRow[]> {
  const market = ctx ?? (await getMarketContext());
  // Only price assets the context actually resolved a quote for.
  const covered = UNIVERSE.filter((a) => market.quotes[a.symbol]);
  return covered.map((a): ScreenRow => {
    const q = market.quotes[a.symbol];
    const criteria = THESIS_CRITERIA.map((c) => ({
      key: c.key,
      label: c.label,
      pass: Boolean(a[c.key as keyof typeof a]),
      weight: c.weight,
    }));
    const thesisFit = criteria.reduce((s, c) => s + (c.pass ? c.weight : 0), 0);
    const grade =
      thesisFit >= 90 ? "A" : thesisFit >= 70 ? "B" : thesisFit >= 50 ? "C" : thesisFit >= 30 ? "D" : "F";

    const t2030 = target2030For(a.symbol, q.price, q.marketCap);
    const vol = volatility(market.series[a.symbol] ?? []);
    const rand = mulberry32(hashSeed(a.symbol + "|liq"));
    const liquidityScore = clamp(
      35 + Math.log10(Math.max(1e6, q.marketCap) / 1e8) * 14 + rand() * 10,
      0,
      100
    );
    const momentum = clamp(50 + q.change30d * 1.4, 0, 100);

    const riskFlags: string[] = [];
    if (!a.regClarity) riskFlags.push("No regulatory clarity");
    if (!a.etf) riskFlags.push("No ETF rail");
    if (!a.realVolume) riskFlags.push("Volume is narrative-driven");
    if (q.drawdownFromAth < -70) riskFlags.push("Down >70% from ATH — community attrition risk");
    if (vol > 95) riskFlags.push("Volatility above 95% annualised");
    if (a.tier === "watch" && AI_EXPOSURE[a.symbol] > 50) riskFlags.push("Late AI pivot — bolt-on, not native");

    const verdict =
      thesisFit >= 90
        ? `Full basket qualifier. Passes every selection criterion. Modelled to ${((t2030 / q.price)).toFixed(1)}x by 2030 on the conservative path.`
        : thesisFit >= 70
          ? `Qualifies on the majority of criteria. ${riskFlags[0] ?? "Minor gaps"} is the gating item before this earns full weight.`
          : thesisFit >= 45
            ? `Partial fit. Held back by: ${riskFlags.slice(0, 2).join("; ")}. Speculative sleeve only.`
            : `Fails the selection filter. ${riskFlags.slice(0, 3).join("; ")}. This is the profile that dies from attention decay in a prolonged winter.`;

    return {
      ...q,
      thesisFit,
      thesisGrade: grade,
      criteria,
      target2030: t2030,
      upside2030: ((t2030 - q.price) / q.price) * 100,
      volatility30d: Math.round(vol * 10) / 10,
      liquidityScore: Math.round(liquidityScore),
      momentum: Math.round(momentum),
      aiExposure: AI_EXPOSURE[a.symbol] ?? 0,
      riskFlags,
      verdict,
    };
  }).sort((a, b) => b.thesisFit - a.thesisFit || b.marketCap - a.marketCap);
}

export async function assetDetail(symbol: string) {
  const market = await getMarketContext([symbol]);
  const rows = await screen(market);
  const row = rows.find((r) => r.symbol === symbol);
  if (!row) return null;
  return { row, series: market.series[symbol], asset: BY_SYMBOL[symbol] };
}

/* ------------------------------------------------------------------ */
/* SEMANTIC LAYER — the typed functions the agent is allowed to call    */
/* ------------------------------------------------------------------ */

export const SEMANTIC_FUNCTIONS = [
  "get_quote",
  "get_price_history",
  "screen_assets",
  "get_exhaustion_score",
  "get_leverage_radar",
  "get_catalysts",
  "get_kol_leaderboard",
  "get_predictions",
  "evaluate_portfolio",
  "scan_contract",
  "compare_assets",
] as const;

export async function compareAssets(symbols: string[], ctx?: MarketContext) {
  const all = await screen(ctx);
  const rows = all.filter((r) => symbols.includes(r.symbol));
  const best = [...rows].sort((a, b) => b.thesisFit - a.thesisFit)[0];
  return {
    rows: rows.map((r) => ({
      symbol: r.symbol,
      name: r.name,
      price: r.price,
      marketCap: r.marketCap,
      thesisFit: r.thesisFit,
      thesisGrade: r.thesisGrade,
      upside2030: Math.round(r.upside2030),
      volatility30d: r.volatility30d,
      aiExposure: r.aiExposure,
      drawdownFromAth: Math.round(r.drawdownFromAth),
      riskFlags: r.riskFlags,
    })),
    winner: best?.symbol ?? null,
    rationale: best
      ? `${best.symbol} carries the highest thesis fit at ${best.thesisFit}/100 (grade ${best.thesisGrade}). ${best.verdict}`
      : "No overlap with the tracked universe.",
  };
}

export async function marketOverview(ctx?: MarketContext) {
  const market = ctx ?? (await getMarketContext());
  const rows = await screen(market);
  const trackedMcap = rows.reduce((s, r) => s + r.marketCap, 0);
  // Prefer CoinGecko's global figures when live; they cover the whole market,
  // not just the tracked universe.
  const totalMcap = market.live.global?.totalMarketCap ?? trackedMcap;
  const btcDominance =
    market.live.global?.btcDominance ??
    ((rows.find((r) => r.symbol === "BTC")?.marketCap ?? 0) / trackedMcap) * 100;
  const advancers = rows.filter((r) => r.change24h > 0).length;
  return {
    totalMarketCap: totalMcap,
    trackedMarketCap: trackedMcap,
    btcDominance: Math.round(btcDominance * 10) / 10,
    advancers,
    decliners: rows.length - advancers,
    breadth: Math.round((advancers / rows.length) * 100),
    qualifiers: rows.filter((r) => r.thesisFit >= 70).length,
    avgDrawdown: Math.round(rows.reduce((s, r) => s + r.drawdownFromAth, 0) / rows.length),
    topByFit: rows.slice(0, 5).map((r) => ({ symbol: r.symbol, fit: r.thesisFit })),
    sentiment: market.live.sentiment,
    tvl: market.live.tvl,
    dataSource: market.live.enabled && Object.keys(market.live.quotes).length ? "live" : "model",
  };
}
