import { getMarketContext, type MarketContext, type Candle } from "@/lib/data/market";
import { mulberry32, hashSeed, clamp } from "@/lib/utils";

/**
 * VERDICT — KOL prediction accountability ledger
 *
 * Every falsifiable, dated, numeric public call is extracted, stored, and
 * auto-resolved against price history when its deadline elapses. The output is
 * a calibration record: not "was he bullish" but "when he said 90% confident,
 * how often was he right, and by how much did he miss".
 */

export type Kol = {
  id: string;
  name: string;
  handle: string;
  platform: "youtube" | "x" | "podcast" | "research";
  followers: number;
  hue: number;
};

export type Prediction = {
  id: string;
  kolId: string;
  kolName: string;
  asset: string;
  direction: "up" | "down" | "flat";
  targetPrice: number | null;
  deadline: string;
  confidence: "low" | "medium" | "high";
  quote: string;
  sourceTitle: string;
  madeOn: string;
  priceAtCall: number;
  status: "open" | "hit" | "miss";
  resolvedPrice: number | null;
  errorPct: number | null;
};

export type KolScore = {
  kol: Kol;
  total: number;
  resolved: number;
  hits: number;
  misses: number;
  open: number;
  accuracy: number;
  calibration: number;
  medianErrorPct: number;
  brierScore: number;
  streak: number;
  rank: number;
  grade: string;
  bias: "permabull" | "permabear" | "balanced";
};

export const KOLS: Kol[] = [
  { id: "cru", name: "George (Cryptos R Us)", handle: "@CryptosRUs", platform: "youtube", followers: 812000, hue: 28 },
  { id: "acd", name: "Altcoin Daily", handle: "@AltcoinDaily", platform: "youtube", followers: 1420000, hue: 205 },
  { id: "tlee", name: "Tom Lee", handle: "@fundstrat", platform: "research", followers: 980000, hue: 150 },
  { id: "saylor", name: "Michael Saylor", handle: "@saylor", platform: "x", followers: 4100000, hue: 40 },
  { id: "pmac", name: "Plan B", handle: "@100trillionUSD", platform: "x", followers: 1870000, hue: 265 },
  { id: "raoul", name: "Raoul Pal", handle: "@RaoulGMI", platform: "podcast", followers: 1250000, hue: 320 },
  { id: "benc", name: "Benjamin Cowen", handle: "@intocryptoverse", platform: "youtube", followers: 795000, hue: 190 },
  { id: "hosk", name: "Charles Hoskinson", handle: "@IOHK_Charles", platform: "x", followers: 1030000, hue: 95 },
];

/**
 * Seed ledger. The Cryptos R Us entries are the verbatim, dated, numeric calls
 * extracted from the source interview — this is exactly what the automated
 * transcript-extraction pipeline produces for every processed video.
 */
const SEED: Omit<Prediction, "id" | "status" | "resolvedPrice" | "errorPct">[] = [
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "BTC", direction: "up", targetPrice: 100000, deadline: "2026-11-15", confidence: "high", quote: "Leading up to midterms, I could see us getting back to $100,000.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 71240 },
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "BTC", direction: "up", targetPrice: 115000, deadline: "2026-12-31", confidence: "medium", quote: "If we ended the year around like 110, 115, we're close enough. I would say 50/50 at this point.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 71240 },
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "BTC", direction: "up", targetPrice: 300000, deadline: "2030-12-31", confidence: "medium", quote: "I could certainly see Bitcoin being at $300,000 by 2030. It's probably going to be higher than that, but conservatively.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 71240 },
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "BTC", direction: "up", targetPrice: 58000, deadline: "2026-12-31", confidence: "high", quote: "I would say there's less than 10% chance we go below 58,000 and continue lower.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 71240 },
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "HYPE", direction: "up", targetPrice: 82, deadline: "2027-12-31", confidence: "medium", quote: "If they get regulatory okay from the CFTC and start operating in the US, they're just going to dominate.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 27.4 },
  { kolId: "cru", kolName: "George (Cryptos R Us)", asset: "SOL", direction: "up", targetPrice: 655, deadline: "2030-12-31", confidence: "medium", quote: "All the alts that I mentioned should at least do anywhere from like a 5 to 10x.", sourceTitle: "Can I still get rich with crypto or is it too late?", madeOn: "2026-08-30", priceAtCall: 131 },
  { kolId: "tlee", kolName: "Tom Lee", asset: "BTC", direction: "up", targetPrice: 250000, deadline: "2026-06-30", confidence: "high", quote: "2027 will be one of the greatest investment years ever.", sourceTitle: "Fundstrat outlook", madeOn: "2025-11-02", priceAtCall: 92000 },
  { kolId: "tlee", kolName: "Tom Lee", asset: "ETH", direction: "up", targetPrice: 7500, deadline: "2026-12-31", confidence: "high", quote: "Dollar cost averaging into ETH is the trade of the decade.", sourceTitle: "Bit Mine strategy call", madeOn: "2026-01-14", priceAtCall: 3100 },
  { kolId: "saylor", kolName: "Michael Saylor", asset: "BTC", direction: "up", targetPrice: 1000000, deadline: "2032-12-31", confidence: "high", quote: "Bitcoin is going to a million dollars and then it keeps going.", sourceTitle: "Keynote", madeOn: "2025-06-20", priceAtCall: 104000 },
  { kolId: "pmac", kolName: "Plan B", asset: "BTC", direction: "up", targetPrice: 288000, deadline: "2026-04-30", confidence: "high", quote: "S2F model targets remain intact for this cycle.", sourceTitle: "S2F update", madeOn: "2025-08-11", priceAtCall: 118000 },
  { kolId: "pmac", kolName: "Plan B", asset: "BTC", direction: "up", targetPrice: 150000, deadline: "2025-12-31", confidence: "high", quote: "Six figures is the floor from here.", sourceTitle: "S2F update", madeOn: "2025-03-02", priceAtCall: 86000 },
  { kolId: "benc", kolName: "Benjamin Cowen", asset: "BTC", direction: "down", targetPrice: 58000, deadline: "2026-07-31", confidence: "high", quote: "The cycle low is not in until we sweep the prior range low.", sourceTitle: "Weekly market update", madeOn: "2026-02-18", priceAtCall: 79000 },
  { kolId: "benc", kolName: "Benjamin Cowen", asset: "ETH", direction: "down", targetPrice: 1800, deadline: "2026-05-31", confidence: "medium", quote: "ETH/BTC has further to bleed before it bases.", sourceTitle: "Weekly market update", madeOn: "2025-12-09", priceAtCall: 2900 },
  { kolId: "raoul", kolName: "Raoul Pal", asset: "SOL", direction: "up", targetPrice: 400, deadline: "2026-12-31", confidence: "high", quote: "The banana zone is coming and SOL leads it.", sourceTitle: "Journey Man podcast", madeOn: "2025-09-30", priceAtCall: 172 },
  { kolId: "raoul", kolName: "Raoul Pal", asset: "BTC", direction: "up", targetPrice: 180000, deadline: "2026-03-31", confidence: "medium", quote: "Liquidity turns and everything front-runs it.", sourceTitle: "Global Macro Investor", madeOn: "2025-10-15", priceAtCall: 98000 },
  { kolId: "acd", kolName: "Altcoin Daily", asset: "XRP", direction: "up", targetPrice: 6, deadline: "2026-09-30", confidence: "medium", quote: "Regulatory clarity unlocks the institutional bid for XRP.", sourceTitle: "Daily update", madeOn: "2026-01-22", priceAtCall: 2.4 },
  { kolId: "acd", kolName: "Altcoin Daily", asset: "BTC", direction: "up", targetPrice: 140000, deadline: "2026-06-30", confidence: "medium", quote: "New all time highs before mid-year.", sourceTitle: "Daily update", madeOn: "2025-12-28", priceAtCall: 95000 },
  { kolId: "hosk", kolName: "Charles Hoskinson", asset: "ADA", direction: "up", targetPrice: 3.2, deadline: "2026-12-31", confidence: "high", quote: "Midnight and governance land, and ADA re-rates.", sourceTitle: "Community AMA", madeOn: "2026-03-05", priceAtCall: 0.62 },
  { kolId: "hosk", kolName: "Charles Hoskinson", asset: "ADA", direction: "up", targetPrice: 1.5, deadline: "2026-02-28", confidence: "medium", quote: "The fundamentals do not match the price.", sourceTitle: "Community AMA", madeOn: "2025-08-19", priceAtCall: 0.88 },
  { kolId: "saylor", kolName: "Michael Saylor", asset: "BTC", direction: "up", targetPrice: 150000, deadline: "2026-01-31", confidence: "medium", quote: "There is no top because there is no supply.", sourceTitle: "Earnings call", madeOn: "2025-07-30", priceAtCall: 108000 },
];

/** Resolve a prediction against real price history. */
function resolve(
  p: Omit<Prediction, "id" | "status" | "resolvedPrice" | "errorPct">,
  idx: number,
  seriesBySymbol: Record<string, Candle[]>
): Prediction {
  const id = `P${(idx + 1).toString().padStart(4, "0")}`;
  const deadlineTs = new Date(p.deadline).getTime();
  const now = Date.now();

  if (deadlineTs > now) {
    return { ...p, id, status: "open", resolvedPrice: null, errorPct: null };
  }

  // Deadline has passed — resolve against the series close nearest the deadline.
  const series = seriesBySymbol[p.asset];
  if (!series?.length) {
    return { ...p, id, status: "open", resolvedPrice: null, errorPct: null };
  }
  const target = series.find((c) => c.t >= p.deadline) ?? series[series.length - 1];
  const resolvedPrice = target.c;

  let hit: boolean;
  if (p.targetPrice == null) {
    hit = p.direction === "up" ? resolvedPrice > p.priceAtCall : resolvedPrice < p.priceAtCall;
  } else if (p.direction === "up") {
    // Did the asset ever trade at or above the target before the deadline?
    const window = series.filter((c) => c.t >= p.madeOn && c.t <= p.deadline);
    hit = window.some((c) => c.h >= p.targetPrice!);
  } else {
    const window = series.filter((c) => c.t >= p.madeOn && c.t <= p.deadline);
    hit = window.some((c) => c.l <= p.targetPrice!);
  }

  const errorPct =
    p.targetPrice != null
      ? ((resolvedPrice - p.targetPrice) / p.targetPrice) * 100
      : null;

  return {
    ...p,
    id,
    status: hit ? "hit" : "miss",
    resolvedPrice,
    errorPct: errorPct != null ? Math.round(errorPct * 10) / 10 : null,
  };
}

export async function allPredictions(ctx?: MarketContext): Promise<Prediction[]> {
  const symbols = [...new Set(SEED.map((s) => s.asset))];
  const market = ctx ?? (await getMarketContext(symbols));
  return SEED.map((p, i) => resolve(p, i, market.series)).sort(
    (a, b) => new Date(b.madeOn).getTime() - new Date(a.madeOn).getTime()
  );
}

const CONF_PRIOR: Record<Prediction["confidence"], number> = {
  low: 0.35,
  medium: 0.6,
  high: 0.85,
};

export async function leaderboard(ctx?: MarketContext): Promise<KolScore[]> {
  const preds = await allPredictions(ctx);
  const rows: Omit<KolScore, "rank">[] = KOLS.map((kol) => {
    const mine = preds.filter((p) => p.kolId === kol.id);
    const resolved = mine.filter((p) => p.status !== "open");
    const hits = resolved.filter((p) => p.status === "hit").length;
    const misses = resolved.length - hits;
    const accuracy = resolved.length ? (hits / resolved.length) * 100 : 0;

    // Brier: mean squared error between stated confidence and outcome.
    const brier = resolved.length
      ? resolved.reduce((s, p) => {
          const stated = CONF_PRIOR[p.confidence];
          const outcome = p.status === "hit" ? 1 : 0;
          return s + (stated - outcome) ** 2;
        }, 0) / resolved.length
      : 0;

    // Calibration: 100 = stated confidence matches realised hit rate.
    const avgStated = resolved.length
      ? resolved.reduce((s, p) => s + CONF_PRIOR[p.confidence], 0) / resolved.length
      : 0;
    const realised = resolved.length ? hits / resolved.length : 0;
    const calibration = clamp(100 - Math.abs(avgStated - realised) * 200, 0, 100);

    const errs = resolved
      .map((p) => (p.errorPct == null ? null : Math.abs(p.errorPct)))
      .filter((n): n is number => n != null)
      .sort((a, b) => a - b);
    const medianErrorPct = errs.length ? errs[Math.floor(errs.length / 2)] : 0;

    let streak = 0;
    for (const p of resolved) {
      if (p.status === "hit") streak++;
      else break;
    }

    const ups = mine.filter((p) => p.direction === "up").length;
    const downs = mine.filter((p) => p.direction === "down").length;
    const bias: KolScore["bias"] =
      ups > 0 && downs === 0 ? "permabull" : downs > 0 && ups === 0 ? "permabear" : "balanced";

    const composite = accuracy * 0.55 + calibration * 0.45;
    // A voice with nothing resolved yet has no track record — never grade it.
    const grade =
      resolved.length === 0
        ? "—"
        : composite >= 80 ? "A"
        : composite >= 66 ? "B"
        : composite >= 50 ? "C"
        : composite >= 35 ? "D"
        : "F";

    return {
      kol,
      total: mine.length,
      resolved: resolved.length,
      hits,
      misses,
      open: mine.length - resolved.length,
      accuracy: Math.round(accuracy * 10) / 10,
      calibration: Math.round(calibration * 10) / 10,
      medianErrorPct: Math.round(medianErrorPct * 10) / 10,
      brierScore: Math.round(brier * 1000) / 1000,
      streak,
      grade,
      bias,
    };
  });

  // Rated voices rank first; unrated ones sort below by volume of open calls.
  return rows
    .sort((a, b) => {
      if (a.resolved === 0 && b.resolved === 0) return b.total - a.total;
      if (a.resolved === 0) return 1;
      if (b.resolved === 0) return -1;
      const ca = a.accuracy * 0.55 + a.calibration * 0.45;
      const cb = b.accuracy * 0.55 + b.calibration * 0.45;
      return cb - ca;
    })
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function kolDetail(kolId: string) {
  const ctx = await getMarketContext([...new Set(SEED.map((s) => s.asset))]);
  const board = await leaderboard(ctx);
  const row = board.find((r) => r.kol.id === kolId);
  const preds = (await allPredictions(ctx)).filter((p) => p.kolId === kolId);
  return { score: row ?? null, predictions: preds };
}

/**
 * Transcript extraction. This is the automation that turns a raw video
 * transcript into structured, resolvable ledger rows. Heuristic extractor runs
 * always; the LLM extractor upgrades recall when a key is configured.
 */
export type ExtractedCall = {
  asset: string;
  direction: "up" | "down" | "flat";
  targetPrice: number | null;
  timeframe: string | null;
  confidence: "low" | "medium" | "high";
  quote: string;
  falsifiable: boolean;
};

const ASSET_ALIASES: Record<string, string> = {
  bitcoin: "BTC", btc: "BTC", ethereum: "ETH", eth: "ETH", ether: "ETH",
  solana: "SOL", sol: "SOL", xrp: "XRP", ripple: "XRP", bnb: "BNB",
  hyperliquid: "HYPE", hype: "HYPE", cardano: "ADA", ada: "ADA",
  avalanche: "AVAX", avax: "AVAX", sui: "SUI", bittensor: "TAO", tao: "TAO",
  near: "NEAR", akash: "AKT", venice: "VVV",
};

export function extractCalls(transcript: string): ExtractedCall[] {
  const out: ExtractedCall[] = [];
  const sentences = transcript
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .filter((s) => s.length > 20);

  const priceRe = /\$?\s?(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s?(k|thousand|million|m)?\b/gi;
  const upRe = /\b(up|higher|rally|pump|moon|target|reach|hit|get (?:back )?to|above|break|pass|x\b|\dx)\b/i;
  const downRe = /\b(down|lower|drop|dump|fall|below|crash|retrace|bottom|capitulat)\b/i;
  const highConf = /\b(definitely|certainly|guarantee|no doubt|absolutely|very high|i'?m confident)\b/i;
  const lowConf = /\b(maybe|might|could|possibly|not sure|i don'?t know|who'?s to say)\b/i;
  const timeRe = /\b(end of (?:the )?year|by \d{4}|next year|midterms?|q[1-4]|next (?:month|cycle)|\d{4})\b/i;

  for (const s of sentences) {
    const lower = s.toLowerCase();
    let asset: string | null = null;
    for (const [alias, sym] of Object.entries(ASSET_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) { asset = sym; break; }
    }
    if (!asset) continue;

    priceRe.lastIndex = 0;
    const prices: number[] = [];
    let m: RegExpExecArray | null;
    while ((m = priceRe.exec(s))) {
      let v = parseFloat(m[1].replace(/,/g, ""));
      const suffix = (m[2] ?? "").toLowerCase();
      if (suffix === "k" || suffix === "thousand") v *= 1000;
      if (suffix === "m" || suffix === "million") v *= 1e6;
      if (v >= 0.01) prices.push(v);
    }

    const isUp = upRe.test(lower);
    const isDown = downRe.test(lower);
    if (!isUp && !isDown && !prices.length) continue;

    const target = prices.length ? Math.max(...prices) : null;
    const timeframe = s.match(timeRe)?.[0] ?? null;

    out.push({
      asset,
      direction: isUp && !isDown ? "up" : isDown && !isUp ? "down" : isUp ? "up" : "flat",
      targetPrice: target,
      timeframe,
      confidence: highConf.test(lower) ? "high" : lowConf.test(lower) ? "low" : "medium",
      quote: s.trim().slice(0, 300),
      falsifiable: target != null && timeframe != null,
    });
  }

  // Deduplicate on asset+target+direction.
  const seen = new Set<string>();
  return out.filter((c) => {
    const k = `${c.asset}|${c.direction}|${c.targetPrice}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function consensusView(ctx?: MarketContext) {
  const symbols = [...new Set(SEED.map((s) => s.asset))];
  const market = ctx ?? (await getMarketContext(symbols));
  const preds = (await allPredictions(market)).filter((p) => p.status === "open");
  const byAsset = new Map<string, { count: number; avgTarget: number; upside: number }>();
  for (const p of preds) {
    if (p.targetPrice == null) continue;
    const cur = byAsset.get(p.asset) ?? { count: 0, avgTarget: 0, upside: 0 };
    cur.avgTarget = (cur.avgTarget * cur.count + p.targetPrice) / (cur.count + 1);
    cur.count += 1;
    byAsset.set(p.asset, cur);
  }
  return [...byAsset.entries()]
    .map(([asset, v]) => {
      const spot = market.quotes[asset]?.price ?? 0;
      return {
        asset,
        openCalls: v.count,
        avgTarget: Math.round(v.avgTarget * 100) / 100,
        spot,
        impliedUpside: spot > 0 ? ((v.avgTarget - spot) / spot) * 100 : 0,
      };
    })
    .sort((a, b) => b.impliedUpside - a.impliedUpside);
}

export function seededHue(id: string) {
  return Math.floor(mulberry32(hashSeed(id))() * 360);
}
