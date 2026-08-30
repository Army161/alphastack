export type Asset = {
  symbol: string;
  name: string;
  coingeckoId: string;
  /** Fallback price used when live data is unavailable. */
  anchorPrice: number;
  marketCap: number;
  circulating: number;
  category: string;
  /** Thesis tier: core | major | outlier | watch */
  tier: "core" | "major" | "outlier" | "watch";
  etf: boolean;
  regClarity: boolean;
  govEngagement: boolean;
  realVolume: boolean;
  tooBigToFail: boolean;
};

export const UNIVERSE: Asset[] = [
  { symbol: "BTC", name: "Bitcoin", coingeckoId: "bitcoin", anchorPrice: 71240, marketCap: 1.41e12, circulating: 19_800_000, category: "Store of value", tier: "core", etf: true, regClarity: true, govEngagement: true, realVolume: true, tooBigToFail: true },
  { symbol: "ETH", name: "Ethereum", coingeckoId: "ethereum", anchorPrice: 2480, marketCap: 2.98e11, circulating: 120_300_000, category: "Smart contract L1", tier: "major", etf: true, regClarity: true, govEngagement: true, realVolume: true, tooBigToFail: true },
  { symbol: "SOL", name: "Solana", coingeckoId: "solana", anchorPrice: 131, marketCap: 7.4e10, circulating: 565_000_000, category: "High-throughput L1", tier: "major", etf: true, regClarity: true, govEngagement: true, realVolume: true, tooBigToFail: true },
  { symbol: "XRP", name: "XRP", coingeckoId: "ripple", anchorPrice: 1.94, marketCap: 1.13e11, circulating: 58_200_000_000, category: "Payments", tier: "major", etf: true, regClarity: true, govEngagement: true, realVolume: true, tooBigToFail: true },
  { symbol: "BNB", name: "BNB", coingeckoId: "binancecoin", anchorPrice: 588, marketCap: 8.2e10, circulating: 139_400_000, category: "Exchange L1", tier: "major", etf: false, regClarity: false, govEngagement: false, realVolume: true, tooBigToFail: true },
  { symbol: "HYPE", name: "Hyperliquid", coingeckoId: "hyperliquid", anchorPrice: 27.4, marketCap: 9.2e9, circulating: 335_000_000, category: "Perp DEX", tier: "outlier", etf: false, regClarity: false, govEngagement: true, realVolume: true, tooBigToFail: false },
  { symbol: "TAO", name: "Bittensor", coingeckoId: "bittensor", anchorPrice: 268, marketCap: 2.5e9, circulating: 9_300_000, category: "AI / model market", tier: "watch", etf: false, regClarity: false, govEngagement: false, realVolume: true, tooBigToFail: false },
  { symbol: "NEAR", name: "NEAR Protocol", coingeckoId: "near", anchorPrice: 2.11, marketCap: 2.6e9, circulating: 1_240_000_000, category: "AI-pivot L1", tier: "watch", etf: false, regClarity: false, govEngagement: false, realVolume: true, tooBigToFail: false },
  { symbol: "AKT", name: "Akash Network", coingeckoId: "akash-network", anchorPrice: 0.94, marketCap: 2.6e8, circulating: 277_000_000, category: "AI infra / DePIN", tier: "watch", etf: false, regClarity: false, govEngagement: false, realVolume: false, tooBigToFail: false },
  { symbol: "VVV", name: "Venice Token", coingeckoId: "venice-token", anchorPrice: 0.86, marketCap: 1.4e8, circulating: 163_000_000, category: "AI inference", tier: "watch", etf: false, regClarity: false, govEngagement: false, realVolume: false, tooBigToFail: false },
  { symbol: "ADA", name: "Cardano", coingeckoId: "cardano", anchorPrice: 0.41, marketCap: 1.48e10, circulating: 36_100_000_000, category: "Smart contract L1", tier: "watch", etf: false, regClarity: true, govEngagement: false, realVolume: false, tooBigToFail: true },
  { symbol: "AVAX", name: "Avalanche", coingeckoId: "avalanche-2", anchorPrice: 16.2, marketCap: 6.9e9, circulating: 425_000_000, category: "Smart contract L1", tier: "watch", etf: false, regClarity: true, govEngagement: false, realVolume: false, tooBigToFail: false },
  { symbol: "SUI", name: "Sui", coingeckoId: "sui", anchorPrice: 1.66, marketCap: 6.1e9, circulating: 3_670_000_000, category: "Smart contract L1", tier: "watch", etf: false, regClarity: false, govEngagement: false, realVolume: true, tooBigToFail: false },
];

export const BY_SYMBOL: Record<string, Asset> = Object.fromEntries(
  UNIVERSE.map((a) => [a.symbol, a])
);

/** Cycle reference levels from the source thesis. */
export const CYCLE = {
  cycleLow: 58000,
  priorAth: 126000,
  lastBearLow: 15000,
  invalidationLow: 58000,
  midtermTarget: 100000,
  yearEndBull: 115000,
  yearEndBear: 82000,
  target2030: 300000,
};
