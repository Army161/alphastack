export type PlanId = "free" | "pro" | "desk";

export type Plan = {
  id: PlanId;
  name: string;
  price: number;
  priceAnnual: number;
  blurb: string;
  highlight?: boolean;
  features: string[];
  limits: {
    agentMessagesPerDay: number;
    scansPerMonth: number;
    alerts: number;
    positions: number;
    universe: number;
    apiKeys: number;
    history: string;
  };
  cta: string;
  stripePriceEnv: string;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Scout",
    price: 0,
    priceAnnual: 0,
    blurb: "The full surface area, throttled. Enough to prove the models work before you pay.",
    features: [
      "All 7 modules, read-only",
      "Exhaustion score (48h delayed)",
      "Crowding index headline number",
      "Top 5 assets in the screener",
      "3 contract scans / month",
      "Public KOL leaderboard",
      "20 agent messages / day",
    ],
    limits: {
      agentMessagesPerDay: 20,
      scansPerMonth: 3,
      alerts: 2,
      positions: 1,
      universe: 5,
      apiKeys: 0,
      history: "30 days",
    },
    cta: "Start free",
    stripePriceEnv: "",
  },
  {
    id: "pro",
    name: "Operator",
    price: 49,
    priceAnnual: 470,
    blurb: "Live signals, every alert, the full universe, and an agent that can actually drive the platform.",
    highlight: true,
    features: [
      "Everything in Scout, live — no delay",
      "Full factor breakdowns + whale override",
      "Liquidation magnet levels & cascade sizing",
      "Full asset universe + comparison + export",
      "Unlimited contract scans",
      "Unlimited exit rungs + Fed pivot override",
      "Transcript call-extractor",
      "Unlimited alerts (in-app, email, webhook)",
      "500 agent messages / day",
      "2 API keys + MCP server access",
    ],
    limits: {
      agentMessagesPerDay: 500,
      scansPerMonth: -1,
      alerts: -1,
      positions: -1,
      universe: -1,
      apiKeys: 2,
      history: "2 years",
    },
    cta: "Go Operator",
    stripePriceEnv: "STRIPE_PRICE_PRO",
  },
  {
    id: "desk",
    name: "Desk",
    price: 299,
    priceAnnual: 2870,
    blurb: "For teams and protocols. Continuous security monitoring, data licensing, and the whole thing over API.",
    features: [
      "Everything in Operator",
      "Continuous contract monitoring (CI webhook)",
      "5 seats included",
      "Full historical data export (CSV / Parquet)",
      "Unlimited API + MCP access, 100k calls/mo",
      "Custom KOL tracking lists",
      "Priority scan queue",
      "Slack / Discord / Telegram alert routing",
      "Unlimited agent messages",
    ],
    limits: {
      agentMessagesPerDay: -1,
      scansPerMonth: -1,
      alerts: -1,
      positions: -1,
      universe: -1,
      apiKeys: 25,
      history: "Full",
    },
    cta: "Book Desk",
    stripePriceEnv: "STRIPE_PRICE_DESK",
  },
];

export const PLAN_BY_ID = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<PlanId, Plan>;

export function limitFor(plan: string, key: keyof Plan["limits"]) {
  return (PLAN_BY_ID[(plan as PlanId) ?? "free"] ?? PLAN_BY_ID.free).limits[key];
}

export function isUnlimited(v: number | string) {
  return v === -1;
}
