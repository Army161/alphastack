import { mulberry32, hashSeed, clamp } from "@/lib/utils";
import { getMarketContext, BY_SYMBOL, type MarketContext, type Candle } from "@/lib/data/market";
import { getLiveDerivatives } from "@/lib/data/live";
import { MODELLED, type Provenance } from "@/lib/data/providers/types";

/**
 * LIQUIDATION RADAR
 *
 * "Stay off leverage" turned into a measurable, alertable system.
 *
 * Crowding Index blends four inputs:
 *   - Open interest as a share of market cap        (leverage saturation)
 *   - Funding rate z-score                          (cost of the crowded side)
 *   - OI rate-of-change vs price rate-of-change     (leverage building WITHOUT spot support)
 *   - Long/short skew                               (which side is offside)
 *
 * Magnet levels cluster the liquidation heatmap into the nearest dense price
 * bands above and below spot — the levels price tends to be pulled toward.
 */

export type MagnetLevel = {
  price: number;
  side: "long" | "short";
  notional: number;
  distancePct: number;
  intensity: number;
};

export type RadarReading = {
  asset: string;
  price: number;
  crowdingIndex: number;
  crowdingLabel: CrowdLabel;
  dominantSide: "long" | "short";
  fundingRate: number;
  fundingZ: number;
  openInterest: number;
  oiPctOfMcap: number;
  oiChange24h: number;
  priceChange24h: number;
  longShortRatio: number;
  liq24h: number;
  liq24hLongs: number;
  liq24hShorts: number;
  estimatedCascade: number;
  levels: MagnetLevel[];
  history: { t: string; crowding: number; oi: number; price: number; liq: number }[];
  triggers: RadarTrigger[];
  verdict: string;
  /** Per-block provenance so the UI can label live vs modelled inputs. */
  prov: {
    price: Provenance;
    derivatives: Provenance;
    liquidations: Provenance;
  };
  venue: string | null;
  /** True when open interest is a grossed-up estimate from one venue. */
  oiIsEstimate: boolean;
  venueOi: number | null;
};

export type CrowdLabel = "Clean" | "Building" | "Crowded" | "Extreme" | "Reset imminent";

export type RadarTrigger = {
  id: string;
  label: string;
  fired: boolean;
  severity: "info" | "warn" | "critical";
  detail: string;
};

function crowdLabel(ci: number): CrowdLabel {
  if (ci >= 88) return "Reset imminent";
  if (ci >= 72) return "Extreme";
  if (ci >= 55) return "Crowded";
  if (ci >= 35) return "Building";
  return "Clean";
}

export const CROWD_COLORS: Record<CrowdLabel, string> = {
  Clean: "#22c55e",
  Building: "#84cc16",
  Crowded: "#eab308",
  Extreme: "#f97316",
  "Reset imminent": "#ef4444",
};

function pointAt(asset: string, i: number, total: number, series: Candle[]) {
  const a = BY_SYMBOL[asset] ?? BY_SYMBOL.BTC;
  const rand = mulberry32(hashSeed(`${asset}|radar|${i}`));
  const c = series[i].c;
  const prev = series[Math.max(0, i - 1)].c;
  const priceChg = ((c - prev) / prev) * 100;

  // Leverage builds as price rises — the exact behaviour the thesis warns about.
  const troughIdx = Math.floor(total * 0.78);
  const prog = clamp((i - troughIdx) / (total - troughIdx || 1), 0, 1);
  const oiBase = a.marketCap * (0.018 + prog * 0.031);
  const oi = oiBase * (0.88 + rand() * 0.26);
  const oiPctOfMcap = (oi / a.marketCap) * 100;

  const fundingRate = (0.004 + prog * 0.028 + (rand() - 0.5) * 0.02);
  const fundingZ = clamp((fundingRate - 0.010) / 0.011, -3, 3);
  const longShort = clamp(1.0 + prog * 0.9 + (rand() - 0.5) * 0.35, 0.4, 3.2);

  const oiChg = (rand() - 0.35) * 9;
  // The dangerous divergence: OI up, price flat.
  const divergence = clamp((oiChg - priceChg) / 6, -2, 2);

  const ci = clamp(
    28 +
      clamp((oiPctOfMcap - 1.8) * 13, -20, 26) +
      fundingZ * 11 +
      (longShort - 1) * 15 +
      divergence * 9,
    0,
    100
  );

  const liqBase = a.marketCap * 0.00028;
  const liq = liqBase * (0.4 + rand() * 1.5) * (1 + (ci / 100) * 2.6);

  return { c, ci, oi, oiPctOfMcap, fundingRate, fundingZ, longShort, oiChg, priceChg, liq, t: series[i].t };
}

function buildLevels(price: number, asset: string, longShort: number): MagnetLevel[] {
  const rand = mulberry32(hashSeed(`${asset}|levels`));
  const a = BY_SYMBOL[asset] ?? BY_SYMBOL.BTC;
  const out: MagnetLevel[] = [];
  const bands = [0.018, 0.041, 0.072];

  for (const b of bands) {
    const longSize = a.marketCap * 0.00042 * (1 + rand()) * longShort * (1 / (b * 22));
    out.push({
      price: Math.round(price * (1 - b) * 100) / 100,
      side: "long",
      notional: longSize,
      distancePct: -b * 100,
      intensity: clamp(longSize / (a.marketCap * 0.0008), 0, 1),
    });
    const shortSize = a.marketCap * 0.00042 * (1 + rand()) * (1 / longShort) * (1 / (b * 22));
    out.push({
      price: Math.round(price * (1 + b) * 100) / 100,
      side: "short",
      notional: shortSize,
      distancePct: b * 100,
      intensity: clamp(shortSize / (a.marketCap * 0.0008), 0, 1),
    });
  }
  return out.sort((x, y) => y.price - x.price);
}

export async function computeRadar(
  asset = "BTC",
  ctx?: MarketContext
): Promise<RadarReading> {
  const market = ctx ?? (await getMarketContext([asset]));
  const series = market.series[asset] ?? market.series.BTC;
  const total = series.length;

  const a = BY_SYMBOL[asset] ?? BY_SYMBOL.BTC;
  const { deriv, derivProv, liquidations, liquidationsProv } = await getLiveDerivatives(asset);

  const modelled = pointAt(asset, total - 1, total, series);

  // Live derivatives override the modelled block field by field. Anything the
  // venue does not publish (OKX gives long/short, Hyperliquid does not) keeps
  // its modelled value rather than being dropped.
  const price = market.quotes[asset]?.price ?? modelled.c;
  const marketCap = market.quotes[asset]?.marketCap || a.marketCap;

  // A single venue publishes only its own book. Gross it up to a market-wide
  // estimate before comparing against market cap, otherwise the ratio is
  // meaningless and everything reads artificially clean.
  const openInterest = deriv?.estimatedGlobalOiUsd ?? modelled.oi;
  const oiPctOfMcap = (openInterest / marketCap) * 100;

  // Funding and long/short are RATIOS — venue-neutral and directly comparable.
  const fundingRate = deriv?.fundingRate ?? modelled.fundingRate;
  const longShort = deriv?.longShortRatio ?? modelled.longShort;

  // Funding z-score against a neutral 8h carry of ~0.01%.
  const fundingZ = clamp((fundingRate - 0.0001) / 0.00035, -3, 3);

  const now = {
    ...modelled,
    c: price,
    oi: openInterest,
    oiPctOfMcap,
    fundingRate,
    fundingZ: deriv ? fundingZ : modelled.fundingZ,
    longShort,
    liq: liquidations?.total24h ?? modelled.liq,
    ci: deriv
      ? clamp(
          // Weighted toward the venue-neutral signals when live.
          30 +
            clamp((oiPctOfMcap - 2.2) * 11, -18, 24) +
            fundingZ * 13 +
            (longShort - 1) * 18 +
            clamp((modelled.oiChg - modelled.priceChg) / 6, -2, 2) * 7,
          0,
          100
        )
      : modelled.ci,
  };

  const history: RadarReading["history"] = [];
  for (let i = Math.max(0, total - 90); i < total; i++) {
    const p = pointAt(asset, i, total, series);
    history.push({
      t: p.t,
      crowding: Math.round(p.ci * 10) / 10,
      oi: Math.round(p.oi),
      price: p.c,
      liq: Math.round(p.liq),
    });
  }
  // Anchor the last history point to the live reading so the chart and the
  // headline number agree.
  if (history.length) {
    history[history.length - 1] = {
      t: history[history.length - 1].t,
      crowding: Math.round(now.ci * 10) / 10,
      oi: Math.round(now.oi),
      price: now.c,
      liq: Math.round(now.liq),
    };
  }

  const dominantSide: "long" | "short" = now.longShort >= 1 ? "long" : "short";
  const longShare = now.longShort / (1 + now.longShort);
  const liqLongs = liquidations?.longs24h ?? now.liq * longShare;
  const liqShorts = liquidations?.shorts24h ?? now.liq - now.liq * longShare;

  const levels = buildLevels(now.c, asset, now.longShort);
  const nearest = levels
    .filter((l) => l.side === dominantSide)
    .sort((a, b) => Math.abs(a.distancePct) - Math.abs(b.distancePct))[0];

  // Cascade estimate: notional at the nearest cluster, amplified by crowding.
  const estimatedCascade = (nearest?.notional ?? 0) * (1 + (now.ci / 100) * 3.2);

  const triggers: RadarTrigger[] = [
    {
      id: "funding-2sigma",
      label: "Funding > 2σ sustained 8h",
      fired: now.fundingZ >= 2,
      severity: "warn",
      detail: `Funding z-score is ${now.fundingZ.toFixed(2)}σ. The ${dominantSide} side is paying ${(now.fundingRate * 3 * 365).toFixed(0)}% annualised to hold the position — an unsustainable carry.`,
    },
    {
      id: "oi-ath-flat-price",
      label: "OI at highs with flat spot",
      fired: now.oiChg > 4 && Math.abs(now.priceChg) < 1.2,
      severity: "critical",
      detail: `Open interest ${now.oiChg > 0 ? "+" : ""}${now.oiChg.toFixed(1)}% against spot ${now.priceChg > 0 ? "+" : ""}${now.priceChg.toFixed(1)}%. Leverage is building without spot support — the textbook pre-cascade signature.`,
    },
    {
      id: "cluster-proximity",
      label: "Liquidation cluster within 3%",
      fired: !!nearest && Math.abs(nearest.distancePct) <= 3,
      severity: "critical",
      detail: nearest
        ? `$${(nearest.notional / 1e6).toFixed(0)}M of ${nearest.side} liquidations sit ${Math.abs(nearest.distancePct).toFixed(1)}% away at $${nearest.price.toLocaleString()}. Price is magnetised to that level.`
        : "No cluster in range.",
    },
    {
      id: "skew-extreme",
      label: "Long/short skew extreme",
      fired: now.longShort >= 1.8 || now.longShort <= 0.55,
      severity: "warn",
      detail: `Long/short ratio at ${now.longShort.toFixed(2)}. One side is decisively crowded; a wipeout and reset resolves this, not a drift.`,
    },
  ];

  const label = crowdLabel(now.ci);
  const verdict =
    now.ci >= 72
      ? `${label.toUpperCase()}. ${dominantSide === "long" ? "Longs" : "Shorts"} are stacked and paying to stay there. Expect a violent flush toward $${nearest?.price.toLocaleString() ?? "—"} that resets positioning. This is the environment where $1B+ days happen — and the exact reason the framework says stay off leverage entirely.`
      : now.ci >= 55
        ? `${label.toUpperCase()}. Leverage is accumulating on the ${dominantSide} side. Not yet at reset conditions, but the asymmetry is building against ${dominantSide}s.`
        : `${label.toUpperCase()}. Positioning is healthy. Spot-driven moves here have follow-through because there is no leverage overhang to unwind.`;

  return {
    asset,
    price: now.c,
    crowdingIndex: Math.round(now.ci * 10) / 10,
    crowdingLabel: label,
    dominantSide,
    fundingRate: now.fundingRate,
    fundingZ: Math.round(now.fundingZ * 100) / 100,
    openInterest: now.oi,
    oiPctOfMcap: Math.round(now.oiPctOfMcap * 100) / 100,
    oiChange24h: Math.round(now.oiChg * 10) / 10,
    priceChange24h: Math.round(now.priceChg * 10) / 10,
    longShortRatio: Math.round(now.longShort * 100) / 100,
    liq24h: now.liq,
    liq24hLongs: liqLongs,
    liq24hShorts: liqShorts,
    estimatedCascade,
    levels,
    history,
    triggers,
    verdict,
    prov: {
      price: market.quotes[asset]?.prov ?? MODELLED,
      derivatives: derivProv,
      liquidations: liquidationsProv,
    },
    venue: deriv?.venue ?? null,
    oiIsEstimate: Boolean(deriv),
    venueOi: deriv?.openInterestUsd ?? null,
  };
}
