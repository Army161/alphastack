import { cached, fetchJson, type Cached } from "../cache";
import { rateLimited, circuitOpen } from "./limiter";

/**
 * CoinGecko — spot prices, market caps and daily history.
 * Works keyless on the public endpoint; COINGECKO_API_KEY upgrades to the Pro
 * host with far higher rate limits.
 */

const KEY = () => process.env.COINGECKO_API_KEY;
const HOST = () =>
  KEY() ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
const HEADERS = (): Record<string, string> =>
  KEY() ? { "x-cg-pro-api-key": KEY()! } : {};

const HOST_KEY = "coingecko";
/** Free tier tolerates roughly one call every 2.5s; Pro is far higher. */
const MIN_GAP_MS = () => (KEY() ? 120 : 2500);

export function isCoolingDown() {
  return circuitOpen(HOST_KEY);
}

function cg<T>(fn: () => Promise<T>) {
  return rateLimited(HOST_KEY, MIN_GAP_MS(), fn);
}

export type CgQuote = {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
};

type SimplePriceResponse = Record<
  string,
  { usd?: number; usd_market_cap?: number; usd_24h_vol?: number; usd_24h_change?: number }
>;

/** One request covers the whole universe — the cheapest way to stay live. */
export async function fetchQuotes(
  ids: string[]
): Promise<Cached<Record<string, CgQuote>> | null> {
  const key = `cg:quotes:${ids.slice().sort().join(",")}`;
  return cached(key, 90_000, async () => {
    const url =
      `${HOST()}/simple/price?ids=${encodeURIComponent(ids.join(","))}` +
      `&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`;
    const json = await cg(() => fetchJson<SimplePriceResponse>(url, { headers: HEADERS() }));
    const out: Record<string, CgQuote> = {};
    for (const [id, v] of Object.entries(json)) {
      if (typeof v.usd !== "number") continue;
      out[id] = {
        price: v.usd,
        marketCap: v.usd_market_cap ?? 0,
        volume24h: v.usd_24h_vol ?? 0,
        change24h: v.usd_24h_change ?? 0,
      };
    }
    if (!Object.keys(out).length) throw new Error("CoinGecko returned no priced assets");
    return out;
  });
}

export type CgCandle = { t: string; c: number; v: number };

/**
 * Daily closes for one asset. Cached for an hour — history barely moves and the
 * free tier is rate limited, so this is the call worth being frugal with.
 */
export async function fetchHistory(
  id: string,
  days = 365
): Promise<Cached<CgCandle[]> | null> {
  return cached(`cg:hist:${id}:${days}`, 12 * 60 * 60_000, async () => {
    const url =
      `${HOST()}/coins/${encodeURIComponent(id)}/market_chart` +
      `?vs_currency=usd&days=${days}&interval=daily`;
    const json = await cg(() =>
      fetchJson<{ prices: [number, number][]; total_volumes: [number, number][] }>(url, {
        headers: HEADERS(),
        timeoutMs: 12000,
      })
    );
    if (!json.prices?.length) throw new Error("CoinGecko returned no history");
    const volByTs = new Map(json.total_volumes?.map(([t, v]) => [t, v]) ?? []);
    return json.prices.map(([ts, price]) => ({
      t: new Date(ts).toISOString().slice(0, 10),
      c: price,
      v: volByTs.get(ts) ?? 0,
    }));
  });
}

export type CgGlobal = {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  marketCapChange24h: number;
};

export async function fetchGlobal(): Promise<Cached<CgGlobal> | null> {
  return cached("cg:global", 10 * 60_000, async () => {
    const json = await cg(() =>
      fetchJson<{
        data: {
          total_market_cap: { usd: number };
          total_volume: { usd: number };
          market_cap_percentage: { btc: number };
          market_cap_change_percentage_24h_usd: number;
        };
      }>(`${HOST()}/global`, { headers: HEADERS() })
    );
    return {
      totalMarketCap: json.data.total_market_cap.usd,
      totalVolume: json.data.total_volume.usd,
      btcDominance: json.data.market_cap_percentage.btc,
      marketCapChange24h: json.data.market_cap_change_percentage_24h_usd,
    };
  });
}

export async function ping(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  if (isCoolingDown()) {
    return { ok: false, latencyMs: 0, error: "rate limited — cooling down, serving cached/model" };
  }
  const t0 = Date.now();
  try {
    await cg(() => fetchJson(`${HOST()}/ping`, { headers: HEADERS(), timeoutMs: 6000 }));
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - t0,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}
