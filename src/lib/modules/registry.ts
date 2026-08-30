export type PlanId = "free" | "pro" | "desk";

export type ModuleDef = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: "Signal" | "Risk" | "Intelligence" | "Security" | "Accountability";
  accent: string;
  accentSoft: string;
  icon: string;
  minPlan: PlanId;
  metricLabel: string;
  features: string[];
  /** What the agent can drive in this module. */
  agentTools: string[];
  monetization: string;
};

export const MODULES: ModuleDef[] = [
  {
    id: "exhaustion",
    slug: "/exhaustion",
    name: "Exhaustion",
    tagline: "Seller Exhaustion Score",
    description:
      "A daily 0–100 composite of the six factors that mark a genuine capitulation bottom, plus the whale-absorption override — the highest-conviction confirmation in the framework.",
    category: "Signal",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.12)",
    icon: "gauge",
    minPlan: "free",
    metricLabel: "SES",
    features: [
      "Six weighted capitulation factors with z-scores",
      "Whale-absorption override detection",
      "180-day score history against price",
      "Plain-English daily narrative",
      "Regime classification with invalidation level",
    ],
    agentTools: ["get_exhaustion_score"],
    monetization: "Free tier shows the score 48h delayed. Pro unlocks live factors, history and alerts.",
  },
  {
    id: "radar",
    slug: "/radar",
    name: "Radar",
    tagline: "Liquidation & leverage crowding",
    description:
      "Turns 'stay off leverage' into a measurable system. Crowding index, funding stress, magnet levels, and cascade sizing — so you see the flush before it happens.",
    category: "Risk",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.12)",
    icon: "radar",
    minPlan: "free",
    metricLabel: "Crowding",
    features: [
      "Four-input crowding index",
      "Liquidation magnet levels above and below spot",
      "Cascade notional estimator",
      "Four alert triggers with severity",
      "90-day OI / crowding / liquidation history",
    ],
    agentTools: ["get_leverage_radar"],
    monetization: "Free shows the crowding number. Pro unlocks magnet levels, triggers and push alerts.",
  },
  {
    id: "terminal",
    slug: "/terminal",
    name: "Terminal",
    tagline: "AI screener & market intelligence",
    description:
      "Every asset graded against the five explicit selection criteria. Answers 'does this belong in the basket', not 'did it pump'. Backed by a typed semantic layer the agent queries directly.",
    category: "Intelligence",
    accent: "#38bdf8",
    accentSoft: "rgba(56,189,248,0.12)",
    icon: "terminal",
    minPlan: "free",
    metricLabel: "Assets",
    features: [
      "Thesis-fit scoring on five weighted criteria",
      "2030 target modelling per market-cap tier",
      "AI-exposure and risk-flag tagging",
      "Side-by-side asset comparison",
      "Typed semantic layer — no free-form SQL",
    ],
    agentTools: ["screen_assets", "get_quote", "compare_assets", "get_price_history"],
    monetization: "Free screens the top 5. Pro unlocks the full universe, comparison and export.",
  },
  {
    id: "ladder",
    slug: "/ladder",
    name: "Ladder",
    tagline: "Exit rules engine",
    description:
      "Executes the exit rules you wrote when you were calm, at the moment you are not. Price rungs, Fed-pivot macro override, allocation drift bands, and a discipline score that tracks whether you actually follow your own plan.",
    category: "Risk",
    accent: "#a855f7",
    accentSoft: "rgba(168,85,247,0.12)",
    icon: "ladder",
    minPlan: "free",
    metricLabel: "Portfolio",
    features: [
      "Laddered take-profit rungs with live distance",
      "Fed pivot regime override",
      "Core / satellite drift bands with rebalance sizing",
      "Discipline score — acted vs skipped",
      "Auto-suggested ladder from cycle targets",
    ],
    agentTools: ["evaluate_portfolio"],
    monetization: "Free tracks one asset. Pro is unlimited positions, alerts and the macro override.",
  },
  {
    id: "sentinel",
    slug: "/sentinel",
    name: "Sentinel",
    tagline: "AI contract security scanner",
    description:
      "Fifteen exploit-class rules derived from the incidents that actually lost money, then an adversarial pass that tries to refute every finding. What survives is what you act on.",
    category: "Security",
    accent: "#f97316",
    accentSoft: "rgba(249,115,22,0.12)",
    icon: "shield",
    minPlan: "free",
    metricLabel: "Scans",
    features: [
      "15 exploit-class static rules with guard detection",
      "Adversarial refutation pass to kill false positives",
      "Exploit scenario + remediation + patch per finding",
      "Risk score, letter grade and gas notes",
      "Paste source or load the vulnerable sample",
    ],
    agentTools: ["scan_contract"],
    monetization: "Free: 3 scans/month. Pro: unlimited. Desk: continuous CI monitoring + enterprise audits.",
  },
  {
    id: "verdict",
    slug: "/verdict",
    name: "Verdict",
    tagline: "KOL accountability ledger",
    description:
      "Every dated, numeric public call — extracted, stored, auto-resolved. Not 'was he bullish' but 'when he said high confidence, how often was he right'. Includes a live transcript extractor.",
    category: "Accountability",
    accent: "#eab308",
    accentSoft: "rgba(234,179,8,0.12)",
    icon: "scale",
    minPlan: "free",
    metricLabel: "Calls",
    features: [
      "Accuracy, calibration and Brier score per voice",
      "Auto-resolution against price history",
      "Paste-a-transcript call extractor",
      "Consensus view with implied upside",
      "Permabull / permabear bias detection",
    ],
    agentTools: ["get_kol_leaderboard", "get_predictions"],
    monetization: "Public leaderboard is the funnel. Pro unlocks full history, per-KOL alerts and the extractor.",
  },
  {
    id: "catalyst",
    slug: "/catalyst",
    name: "Catalyst",
    tagline: "Event calendar & macro regime",
    description:
      "The dated binary events that actually drive the next leg — legislation, FOMC, midterms, reserve purchases — each scored for impact, direction and time-decay into a single net skew.",
    category: "Signal",
    accent: "#14b8a6",
    accentSoft: "rgba(20,184,166,0.12)",
    icon: "calendar",
    minPlan: "free",
    metricLabel: "Net skew",
    features: [
      "Impact- and decay-weighted net skew",
      "Fed pivot regime monitor",
      "What-to-watch-for on every event",
      "120-day forward book",
      "Category and direction filtering",
    ],
    agentTools: ["get_catalysts"],
    monetization: "Free shows the next 3 events. Pro unlocks the full book, skew history and alerts.",
  },
];

export const MODULE_BY_ID = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export const PLAN_RANK: Record<PlanId, number> = { free: 0, pro: 1, desk: 2 };

export function canAccess(userPlan: string, modulePlan: PlanId) {
  return (PLAN_RANK[userPlan as PlanId] ?? 0) >= PLAN_RANK[modulePlan];
}
