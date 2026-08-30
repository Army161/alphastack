import { CYCLE, BY_SYMBOL, getMarketContext, type MarketContext } from "@/lib/data/market";
import { getLive } from "@/lib/data/live";
import { MODELLED, type Provenance } from "@/lib/data/providers/types";
import { mulberry32, hashSeed, clamp } from "@/lib/utils";

/**
 * EXIT LADDER ENGINE
 *
 * A rules engine that executes the USER'S OWN pre-committed exit rules.
 * It does not generate advice — it enforces decisions made when the user was
 * calm, at the moment they are not.
 *
 * Three layers:
 *   1. Price rungs      — laddered take-profit tiers the user defined
 *   2. Macro override   — Fed pivot from cutting to hiking = regime flag
 *   3. Allocation drift — target barbell (core % / satellite %) with bands
 */

export type Holding = {
  id: string;
  symbol: string;
  quantity: number;
  costBasis: number;
};

export type Rung = {
  id: string;
  symbol: string;
  triggerPrice: number;
  sellPct: number;
  note?: string | null;
  status: "armed" | "triggered" | "executed" | "skipped";
  triggeredAt?: number | null;
  actedAt?: number | null;
};

export type EvaluatedRung = Rung & {
  currentPrice: number;
  distancePct: number;
  proceedsUsd: number;
  quantityToSell: number;
  isHit: boolean;
  multipleFromBasis: number;
};

export type PositionRow = {
  symbol: string;
  name: string;
  quantity: number;
  costBasis: number;
  price: number;
  value: number;
  pnl: number;
  pnlPct: number;
  allocation: number;
  targetAllocation: number;
  drift: number;
  driftState: "ok" | "over" | "under";
};

export type MacroRegime = {
  state: "easing" | "neutral" | "tightening";
  label: string;
  fedFunds: number;
  impliedPath12m: number;
  curve2s10s: number | null;
  pivotDetected: boolean;
  detail: string;
  action: string;
  asOf: string | null;
  prov: Provenance;
};

export type LadderReport = {
  positions: PositionRow[];
  totalValue: number;
  totalCost: number;
  totalPnl: number;
  totalPnlPct: number;
  coreAllocation: number;
  satelliteAllocation: number;
  targetCore: number;
  rungs: EvaluatedRung[];
  nextRung: EvaluatedRung | null;
  realisedIfAllHit: number;
  macro: MacroRegime;
  disciplineScore: number;
  disciplineDetail: string;
  rebalanceActions: string[];
};

/** Barbell targets from the framework: 70–75% core, 25% satellite, 50% floor. */
export const ALLOCATION_PROFILES = {
  conservative: { core: 80, band: 8 },
  balanced: { core: 72, band: 10 },
  aggressive: { core: 55, band: 12 },
} as const;

export type RiskProfile = keyof typeof ALLOCATION_PROFILES;

const CORE_SYMBOLS = new Set(["BTC"]);

/**
 * Macro regime monitor. The one named exit signal in the framework: when the
 * Fed pivots from a cutting cycle to a hiking cycle, markets historically
 * underperform for roughly the following year.
 */
/**
 * Live from FRED when reachable: the effective fed funds rate and the 2-year
 * Treasury. The 2y IS the market's ~12-month rate expectation, so 2y above
 * fed funds means hikes are priced — the framework's one named exit signal.
 */
export async function computeMacroRegime(): Promise<MacroRegime> {
  const live = await getLive();

  let fedFunds: number;
  let impliedPath12m: number;
  let curve2s10s: number | null;
  let asOf: string | null;
  let prov: Provenance;

  if (live.rates) {
    fedFunds = live.rates.fedFunds;
    impliedPath12m = live.rates.impliedPath12m;
    curve2s10s = Math.round(live.rates.curve2s10s * 100) / 100;
    asOf = live.rates.asOf;
    prov = live.ratesProv;
  } else {
    const rand = mulberry32(hashSeed("macro|" + new Date().toISOString().slice(0, 10)));
    fedFunds = 3.75 + Math.round(rand() * 4) * 0.25;
    impliedPath12m = fedFunds - 0.5 + (rand() - 0.35) * 1.4;
    curve2s10s = null;
    asOf = null;
    prov = MODELLED;
  }

  const delta = impliedPath12m - fedFunds;

  let state: MacroRegime["state"];
  if (delta < -0.35) state = "easing";
  else if (delta > 0.35) state = "tightening";
  else state = "neutral";

  const pivotDetected = state === "tightening";

  return {
    state,
    curve2s10s,
    asOf,
    prov,
    label:
      state === "easing"
        ? "Easing cycle"
        : state === "tightening"
          ? "TIGHTENING — pivot detected"
          : "Neutral / on hold",
    fedFunds: Math.round(fedFunds * 100) / 100,
    impliedPath12m: Math.round(impliedPath12m * 100) / 100,
    pivotDetected,
    detail:
      state === "easing"
        ? `Effective fed funds at ${fedFunds.toFixed(2)}% with the 12-month implied path at ${impliedPath12m.toFixed(2)}% — the market is pricing continued cuts. Risk assets have a tailwind; no defensive trigger.`
        : state === "tightening"
          ? `Effective fed funds at ${fedFunds.toFixed(2)}% but the 12-month implied path has flipped UP to ${impliedPath12m.toFixed(2)}%. This is the pivot-to-hiking signal — historically the single cleanest marker that the following ~12 months underperform.`
          : `Effective fed funds at ${fedFunds.toFixed(2)}%, implied path ${impliedPath12m.toFixed(2)}% — no directional conviction priced. Hold current allocation.`,
    action:
      state === "tightening"
        ? "REGIME FLAG RAISED. Your pre-committed defensive action is queued for confirmation."
        : state === "easing"
          ? "No action. Continue the ladder as written."
          : "No action. Monitor for a path flip.",
  };
}

export async function evaluateLadder(
  holdings: Holding[],
  rungs: Rung[],
  profile: RiskProfile = "balanced",
  ctx?: MarketContext
): Promise<LadderReport> {
  const target = ALLOCATION_PROFILES[profile];
  const symbols = [...new Set([...holdings.map((h) => h.symbol), ...rungs.map((r) => r.symbol)])];
  const market = ctx ?? (await getMarketContext(symbols.length ? symbols : ["BTC"]));
  const priceOf = (symbol: string) =>
    market.quotes[symbol]?.price ?? BY_SYMBOL[symbol]?.anchorPrice ?? 0;

  const priced = holdings.map((h) => {
    const price = priceOf(h.symbol);
    const value = h.quantity * price;
    const cost = h.quantity * h.costBasis;
    return { h, price, value, cost };
  });

  const totalValue = priced.reduce((s, p) => s + p.value, 0);
  const totalCost = priced.reduce((s, p) => s + p.cost, 0);

  const coreValue = priced
    .filter((p) => CORE_SYMBOLS.has(p.h.symbol))
    .reduce((s, p) => s + p.value, 0);
  const coreAllocation = totalValue > 0 ? (coreValue / totalValue) * 100 : 0;
  const satelliteAllocation = 100 - coreAllocation;

  const satelliteCount = priced.filter((p) => !CORE_SYMBOLS.has(p.h.symbol)).length || 1;

  const positions: PositionRow[] = priced.map((p) => {
    const allocation = totalValue > 0 ? (p.value / totalValue) * 100 : 0;
    const isCore = CORE_SYMBOLS.has(p.h.symbol);
    const targetAllocation = isCore
      ? target.core
      : (100 - target.core) / satelliteCount;
    const drift = allocation - targetAllocation;
    return {
      symbol: p.h.symbol,
      name: BY_SYMBOL[p.h.symbol]?.name ?? p.h.symbol,
      quantity: p.h.quantity,
      costBasis: p.h.costBasis,
      price: p.price,
      value: p.value,
      pnl: p.value - p.cost,
      pnlPct: p.cost > 0 ? ((p.value - p.cost) / p.cost) * 100 : 0,
      allocation,
      targetAllocation,
      drift,
      driftState: Math.abs(drift) <= target.band ? "ok" : drift > 0 ? "over" : "under",
    };
  });

  const evaluated: EvaluatedRung[] = rungs
    .map((r) => {
      const price = priceOf(r.symbol);
      const holding = holdings.find((h) => h.symbol === r.symbol);
      const qty = holding ? (holding.quantity * r.sellPct) / 100 : 0;
      return {
        ...r,
        currentPrice: price,
        distancePct: price > 0 ? ((r.triggerPrice - price) / price) * 100 : 0,
        quantityToSell: qty,
        proceedsUsd: qty * r.triggerPrice,
        isHit: price >= r.triggerPrice,
        multipleFromBasis: holding ? r.triggerPrice / holding.costBasis : 0,
      };
    })
    .sort((a, b) => a.triggerPrice - b.triggerPrice);

  // "Next" means nearest to being hit in percentage terms — not the lowest
  // absolute price, which would always favour the cheapest asset.
  const nextRung =
    [...evaluated]
      .filter((r) => !r.isHit && r.status !== "skipped" && r.status !== "executed")
      .sort((a, b) => a.distancePct - b.distancePct)[0] ?? null;

  const realisedIfAllHit = evaluated
    .filter((r) => r.status !== "skipped")
    .reduce((s, r) => s + r.proceedsUsd, 0);

  const acted = evaluated.filter((r) => r.status === "executed").length;
  // A rung price has crossed but the user has not acted on is a "missed" decision.
  const missed = evaluated.filter(
    (r) => r.isHit && (r.status === "armed" || r.status === "triggered")
  ).length;
  const totalResolved = acted + missed;
  const disciplineScore =
    totalResolved === 0 ? 100 : Math.round((acted / totalResolved) * 100);

  const rebalanceActions: string[] = [];
  for (const p of positions) {
    if (p.driftState === "over") {
      const excess = ((p.drift / 100) * totalValue);
      rebalanceActions.push(
        `${p.symbol} is ${p.drift.toFixed(1)}pp over its ${p.targetAllocation.toFixed(0)}% target — trim ~${(excess / p.price).toFixed(4)} ${p.symbol} ($${Math.round(excess).toLocaleString()}) to return to band.`
      );
    } else if (p.driftState === "under") {
      const deficit = Math.abs((p.drift / 100) * totalValue);
      rebalanceActions.push(
        `${p.symbol} is ${Math.abs(p.drift).toFixed(1)}pp under target — add ~$${Math.round(deficit).toLocaleString()} to restore the ${p.targetAllocation.toFixed(0)}% weight.`
      );
    }
  }
  if (coreAllocation < 50) {
    rebalanceActions.unshift(
      `CORE FLOOR BREACHED: core allocation is ${coreAllocation.toFixed(1)}%, below the 50% hard floor. The framework treats this as the primary portfolio risk — satellite exposure is oversized relative to the anchor.`
    );
  }

  return {
    positions: positions.sort((a, b) => b.value - a.value),
    totalValue,
    totalCost,
    totalPnl: totalValue - totalCost,
    totalPnlPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    coreAllocation,
    satelliteAllocation,
    targetCore: target.core,
    rungs: evaluated,
    nextRung,
    realisedIfAllHit,
    macro: await computeMacroRegime(),
    disciplineScore,
    disciplineDetail:
      totalResolved === 0
        ? "No rungs have resolved yet. Your discipline score activates once price hits your first tier."
        : `You have acted on ${acted} of ${totalResolved} triggered rungs. Every skipped rung is a decision your calm self made and your present self overrode.`,
    rebalanceActions,
  };
}

/** Generate a sensible default ladder from cycle targets. */
export async function suggestLadder(symbol: string, quantity: number) {
  const market = await getMarketContext([symbol]);
  const price = market.quotes[symbol]?.price ?? BY_SYMBOL[symbol]?.anchorPrice ?? 1;
  const isCore = symbol === "BTC";
  const tiers = isCore
    ? [
        { mult: CYCLE.midtermTarget / price, pct: 5 },
        { mult: CYCLE.yearEndBull / price, pct: 10 },
        { mult: (CYCLE.priorAth * 1.15) / price, pct: 15 },
        { mult: CYCLE.target2030 / price, pct: 20 },
      ]
    : [
        { mult: 2.5, pct: 15 },
        { mult: 5, pct: 20 },
        { mult: 10, pct: 25 },
      ];
  return tiers.map((t) => ({
    symbol,
    triggerPrice: Math.round(price * t.mult * 100) / 100,
    sellPct: t.pct,
    note: `${t.mult.toFixed(1)}x from spot`,
    quantityToSell: (quantity * t.pct) / 100,
  }));
}

export function allocationHealth(core: number, profile: RiskProfile) {
  const t = ALLOCATION_PROFILES[profile];
  const diff = Math.abs(core - t.core);
  return clamp(100 - (diff / t.band) * 40, 0, 100);
}
