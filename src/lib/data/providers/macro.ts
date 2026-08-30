import { cached, fetchJson, fetchText, type Cached } from "../cache";

/**
 * Macro and sentiment inputs.
 *   FRED             — effective fed funds and the 2y/10y curve (keyless CSV)
 *   Alternative.me   — Fear & Greed index
 *   DefiLlama        — chain TVL
 */

/* -------------------------------------------------------------- FRED */

export type RatesSnapshot = {
  fedFunds: number;
  twoYear: number;
  tenYear: number;
  /** 2y yield minus fed funds — what the market prices over the next ~12 months. */
  impliedPath12m: number;
  curve2s10s: number;
  asOf: string;
};

/**
 * FRED's graph CSV endpoint needs no API key. Values arrive newest-last and
 * missing observations are marked ".".
 */
async function fredLatest(seriesId: string): Promise<{ value: number; date: string }> {
  const csv = await fetchText(
    `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`,
    { timeoutMs: 10000 }
  );
  const lines = csv.trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 1; i--) {
    const [date, raw] = lines[i].split(",");
    const v = Number(raw);
    if (Number.isFinite(v) && raw?.trim() !== ".") return { value: v, date };
  }
  throw new Error(`FRED series ${seriesId} had no usable observations`);
}

export async function fetchRates(): Promise<Cached<RatesSnapshot> | null> {
  return cached("fred:rates", 6 * 60 * 60_000, async () => {
    const [ff, two, ten] = await Promise.all([
      fredLatest("DFF"), // effective fed funds
      fredLatest("DGS2"), // 2y Treasury
      fredLatest("DGS10"), // 10y Treasury
    ]);
    return {
      fedFunds: ff.value,
      twoYear: two.value,
      tenYear: ten.value,
      // The 2y is the market's ~12-month rate expectation. Above fed funds
      // means hikes are priced; below means cuts.
      impliedPath12m: two.value,
      curve2s10s: ten.value - two.value,
      asOf: ff.date,
    };
  });
}

/* --------------------------------------------------- Fear & Greed */

export type SentimentSnapshot = {
  value: number;
  classification: string;
  asOf: string;
};

export async function fetchSentiment(): Promise<Cached<SentimentSnapshot> | null> {
  return cached("fng", 60 * 60_000, async () => {
    const json = await fetchJson<{
      data: { value: string; value_classification: string; timestamp: string }[];
    }>("https://api.alternative.me/fng/?limit=1");
    const row = json.data?.[0];
    if (!row) throw new Error("Fear & Greed returned no data");
    return {
      value: Number(row.value),
      classification: row.value_classification,
      asOf: new Date(Number(row.timestamp) * 1000).toISOString().slice(0, 10),
    };
  });
}

/* ---------------------------------------------------- DefiLlama TVL */

export type TvlSnapshot = Record<string, number>;

const LLAMA_CHAIN: Record<string, string> = {
  ETH: "Ethereum",
  SOL: "Solana",
  BNB: "BSC",
  AVAX: "Avalanche",
  SUI: "Sui",
  ADA: "Cardano",
  NEAR: "Near",
  HYPE: "Hyperliquid L1",
  BTC: "Bitcoin",
};

export async function fetchTvl(): Promise<Cached<TvlSnapshot> | null> {
  return cached("llama:chains", 60 * 60_000, async () => {
    const json = await fetchJson<{ name: string; tvl: number }[]>(
      "https://api.llama.fi/v2/chains",
      { timeoutMs: 12000 }
    );
    const byName = new Map(json.map((c) => [c.name, c.tvl]));
    const out: TvlSnapshot = {};
    for (const [symbol, chain] of Object.entries(LLAMA_CHAIN)) {
      const tvl = byName.get(chain);
      if (typeof tvl === "number" && tvl > 0) out[symbol] = tvl;
    }
    if (!Object.keys(out).length) throw new Error("DefiLlama returned no matching chains");
    return out;
  });
}

/* ------------------------------------------------------------ pings */

async function timedPing(fn: () => Promise<unknown>) {
  const t0 = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export const pingFred = () =>
  timedPing(() =>
    fetchText("https://fred.stlouisfed.org/graph/fredgraph.csv?id=DFF", { timeoutMs: 8000 })
  );

export const pingSentiment = () =>
  timedPing(() => fetchJson("https://api.alternative.me/fng/?limit=1", { timeoutMs: 6000 }));

export const pingLlama = () =>
  timedPing(() => fetchJson("https://api.llama.fi/v2/chains", { timeoutMs: 9000 }));
