import { computeMacroRegime } from "./ladder";

/**
 * CATALYST — event calendar + macro regime monitor
 *
 * Tracks the dated, binary events that the thesis identifies as the actual
 * drivers of the next leg, and scores each one for impact and direction.
 */

export type CatalystEvent = {
  id: string;
  title: string;
  category: "regulatory" | "monetary" | "political" | "structural" | "macro" | "protocol";
  date: string;
  impact: "low" | "medium" | "high" | "extreme";
  direction: "bullish" | "bearish" | "two-sided";
  status: "scheduled" | "pending" | "confirmed" | "passed" | "failed";
  detail: string;
  source: string;
  watchFor: string;
};

export const CATALYSTS: CatalystEvent[] = [
  {
    id: "clarity-act",
    title: "CLARITY Act floor vote",
    category: "regulatory",
    date: "2026-09-24",
    impact: "extreme",
    direction: "bullish",
    status: "scheduled",
    detail:
      "Comprehensive market-structure legislation assigning clear SEC/CFTC jurisdiction over digital assets. Passage removes the single largest institutional-allocation blocker and retroactively de-risks every token whose classification is ambiguous.",
    source: "Congress.gov legislative tracker",
    watchFor:
      "Committee markup language on the token-classification test. A narrow test is bullish for the majors and bearish for the long tail.",
  },
  {
    id: "fomc-sep",
    title: "FOMC decision + dot plot",
    category: "monetary",
    date: "2026-09-17",
    impact: "high",
    direction: "two-sided",
    status: "scheduled",
    detail:
      "Rate decision plus the updated summary of economic projections. The dot plot is what matters — not the cut itself but whether the 12-month path still slopes down.",
    source: "Federal Reserve / CME FedWatch",
    watchFor:
      "A dot plot that flips the 12-month path upward is the pivot-to-hiking signal — the one named exit trigger in the framework.",
  },
  {
    id: "midterms",
    title: "US midterm elections",
    category: "political",
    date: "2026-11-03",
    impact: "extreme",
    direction: "two-sided",
    status: "scheduled",
    detail:
      "Composition of Congress determines whether the current pro-crypto legislative posture survives into 2027. The thesis explicitly anchors the $100K target to momentum building into this date.",
    source: "FEC calendar",
    watchFor:
      "Senate Banking and House Financial Services committee chairs. Continuity is the bullish case; a reversal stalls every pending bill.",
  },
  {
    id: "strategic-reserve",
    title: "US strategic Bitcoin reserve purchase schedule",
    category: "structural",
    date: "2026-10-15",
    impact: "extreme",
    direction: "bullish",
    status: "pending",
    detail:
      "Announcement of interval purchases, or issuance of bonds specifically to fund acquisition. This converts the US from a passive holder of forfeited coin into a programmatic bid.",
    source: "Treasury / Executive Order tracker",
    watchFor:
      "Any language specifying a purchase cadence or a dollar amount. A schedule is worth vastly more than a one-off announcement.",
  },
  {
    id: "cpi-sep",
    title: "CPI release",
    category: "macro",
    date: "2026-09-11",
    impact: "high",
    direction: "two-sided",
    status: "scheduled",
    detail:
      "Headline and core print. The transmission chain in the thesis runs: war resolution → oil down → inflation down → no hikes → risk assets bid.",
    source: "BLS",
    watchFor: "Core services ex-shelter. That is the component the Fed actually reacts to.",
  },
  {
    id: "cftc-hyperliquid",
    title: "CFTC registration decision — offshore perp DEX onshoring",
    category: "regulatory",
    date: "2026-12-01",
    impact: "high",
    direction: "bullish",
    status: "pending",
    detail:
      "Whether a leading perp DEX obtains clearance to serve US users. Named explicitly in the thesis as the unlock that turns an outlier into a dominant venue.",
    source: "CFTC filings",
    watchFor: "A DCM or FBOT designation, versus a no-action letter. The former is structural; the latter is temporary.",
  },
  {
    id: "etf-alt-decision",
    title: "Altcoin spot ETF decision window",
    category: "regulatory",
    date: "2026-10-08",
    impact: "high",
    direction: "bullish",
    status: "scheduled",
    detail:
      "Final deadlines for several spot altcoin ETF applications. Approval extends the institutional flow rail beyond BTC and ETH — the precondition for the 5–10x majors case.",
    source: "SEC EDGAR 19b-4 tracker",
    watchFor: "In-kind creation/redemption language. In-kind is materially better for spreads and therefore for flows.",
  },
  {
    id: "opec-meeting",
    title: "OPEC+ production meeting",
    category: "macro",
    date: "2026-09-29",
    impact: "medium",
    direction: "two-sided",
    status: "scheduled",
    detail:
      "Oil is the upstream variable in the inflation chain. A supply increase feeds directly into the disinflation path that the 2027 bull case depends on.",
    source: "OPEC secretariat",
    watchFor: "Quota compliance, not headline quota. Compliance is what moves the physical barrel.",
  },
  {
    id: "halving-2028",
    title: "Fifth Bitcoin halving",
    category: "protocol",
    date: "2028-04-20",
    impact: "medium",
    direction: "bullish",
    status: "scheduled",
    detail:
      "Issuance drops again. Note the framework's own caveat: the four-year cycle appears degraded, with rates and the business cycle now dominating the halving as a driver. Weight accordingly.",
    source: "Bitcoin protocol",
    watchFor: "Whether price behaviour around the event still rhymes with prior cycles, or confirms the cycle-is-dead thesis.",
  },
  {
    id: "bond-auction",
    title: "Long-end Treasury auction series",
    category: "macro",
    date: "2026-09-12",
    impact: "medium",
    direction: "two-sided",
    status: "scheduled",
    detail:
      "Bond market weakness is one of the named 2027 risk conditions. Poor tails at the long end signal funding stress that historically bleeds into risk assets.",
    source: "TreasuryDirect",
    watchFor: "Bid-to-cover and the tail versus the when-issued level.",
  },
];

export const IMPACT_WEIGHT = { low: 1, medium: 2, high: 4, extreme: 7 } as const;

export const CATEGORY_COLORS: Record<CatalystEvent["category"], string> = {
  regulatory: "#8b5cf6",
  monetary: "#f59e0b",
  political: "#ec4899",
  structural: "#14b8a6",
  macro: "#3b82f6",
  protocol: "#f97316",
};

export type CatalystReport = {
  events: (CatalystEvent & { daysAway: number })[];
  next: (CatalystEvent & { daysAway: number }) | null;
  netSkew: number;
  skewLabel: string;
  bullishWeight: number;
  bearishWeight: number;
  window30d: number;
  macro: Awaited<ReturnType<typeof computeMacroRegime>>;
  briefing: string;
};

export async function computeCatalysts(): Promise<CatalystReport> {
  const now = Date.now();
  const events = CATALYSTS.map((e) => ({
    ...e,
    daysAway: Math.round((new Date(e.date).getTime() - now) / 86400000),
  }))
    .filter((e) => e.daysAway > -30)
    .sort((a, b) => a.daysAway - b.daysAway);

  const upcoming = events.filter((e) => e.daysAway >= 0);
  const horizon = upcoming.filter((e) => e.daysAway <= 120);

  let bull = 0;
  let bear = 0;
  for (const e of horizon) {
    const w = IMPACT_WEIGHT[e.impact] * Math.max(0.35, 1 - e.daysAway / 180);
    if (e.direction === "bullish") bull += w;
    else if (e.direction === "bearish") bear += w;
    else {
      bull += w * 0.5;
      bear += w * 0.5;
    }
  }
  const total = bull + bear || 1;
  const netSkew = Math.round(((bull - bear) / total) * 100);

  const skewLabel =
    netSkew > 35 ? "Bullish skew" : netSkew < -35 ? "Bearish skew" : "Two-sided";

  const macro = await computeMacroRegime();
  const next = upcoming[0] ?? null;

  const briefing = [
    next
      ? `Next dated event: ${next.title} in ${next.daysAway} day${next.daysAway === 1 ? "" : "s"} (${next.impact.toUpperCase()} impact, ${next.direction}).`
      : "No dated events in the tracked window.",
    `The 120-day catalyst book carries a ${skewLabel.toLowerCase()} at ${netSkew > 0 ? "+" : ""}${netSkew}, weighted for impact and time-decay.`,
    `Macro regime: ${macro.label}. ${macro.action}`,
    horizon.filter((e) => e.impact === "extreme").length > 0
      ? `Extreme-impact events in window: ${horizon.filter((e) => e.impact === "extreme").map((e) => e.title).join(", ")}. These are the binary outcomes the entire path depends on.`
      : "No extreme-impact events inside the 120-day window.",
  ].join(" ");

  return {
    events,
    next,
    netSkew,
    skewLabel,
    bullishWeight: Math.round(bull * 10) / 10,
    bearishWeight: Math.round(bear * 10) / 10,
    window30d: upcoming.filter((e) => e.daysAway <= 30).length,
    macro,
    briefing,
  };
}
