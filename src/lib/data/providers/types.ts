export type ProviderId =
  | "coingecko"
  | "okx"
  | "hyperliquid"
  | "defillama"
  | "alternative.me"
  | "fred"
  | "coinglass"
  | "model";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  /** What this provider supplies. */
  supplies: string[];
  keyless: boolean;
  envKey?: string;
  docs: string;
};

export const PROVIDERS: Record<Exclude<ProviderId, "model">, ProviderMeta> = {
  coingecko: {
    id: "coingecko",
    label: "CoinGecko",
    supplies: ["Spot prices", "Market cap", "24h/7d/30d change", "Daily price history"],
    keyless: true,
    envKey: "COINGECKO_API_KEY",
    docs: "https://docs.coingecko.com/reference/introduction",
  },
  okx: {
    id: "okx",
    label: "OKX",
    supplies: ["Open interest", "Funding rate", "Long/short account ratio"],
    keyless: true,
    docs: "https://www.okx.com/docs-v5/en/",
  },
  hyperliquid: {
    id: "hyperliquid",
    label: "Hyperliquid",
    supplies: ["Perp funding", "Open interest", "Oracle price"],
    keyless: true,
    docs: "https://hyperliquid.gitbook.io/hyperliquid-docs",
  },
  defillama: {
    id: "defillama",
    label: "DefiLlama",
    supplies: ["Chain TVL", "Protocol revenue"],
    keyless: true,
    docs: "https://defillama.com/docs/api",
  },
  "alternative.me": {
    id: "alternative.me",
    label: "Alternative.me",
    supplies: ["Fear & Greed index"],
    keyless: true,
    docs: "https://alternative.me/crypto/fear-and-greed-index/",
  },
  fred: {
    id: "fred",
    label: "FRED (St. Louis Fed)",
    supplies: ["Effective fed funds rate", "2y/10y Treasury yields"],
    keyless: true,
    docs: "https://fred.stlouisfed.org/",
  },
  coinglass: {
    id: "coinglass",
    label: "Coinglass",
    supplies: ["Liquidation totals", "Liquidation heatmap"],
    keyless: false,
    envKey: "COINGLASS_API_KEY",
    docs: "https://docs.coinglass.com/",
  },
};

/** Per-field provenance so the UI can show exactly where a number came from. */
export type Provenance = {
  source: ProviderId;
  fetchedAt: number | null;
  stale: boolean;
  note?: string;
};

export const MODELLED: Provenance = {
  source: "model",
  fetchedAt: null,
  stale: false,
  note: "Deterministic model — reproducible, not live",
};

export function liveProv(source: ProviderId, fetchedAt: number, stale = false): Provenance {
  return { source, fetchedAt, stale };
}

export type ProviderHealth = {
  id: ProviderId;
  label: string;
  ok: boolean;
  latencyMs: number | null;
  error?: string;
  supplies: string[];
  keyless: boolean;
  configured: boolean;
};
