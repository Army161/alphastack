/**
 * Per-host rate limiting and circuit breaking.
 *
 * The free CoinGecko tier allows only a handful of calls per minute, so the
 * naive approach (one history request per asset on every cold render) trips a
 * 429 immediately and takes the whole price layer down with it.
 *
 * Three protections:
 *   1. Serial queue with a minimum gap between calls to one host
 *   2. Circuit breaker — a 429 opens the circuit and short-circuits further
 *      calls for a cool-down instead of burning the quota discovering it again
 *   3. Exponential backoff on repeated trips
 */

type HostState = {
  queue: Promise<unknown>;
  lastCallAt: number;
  openUntil: number;
  consecutiveTrips: number;
};

const hosts = new Map<string, HostState>();

function stateFor(host: string): HostState {
  let s = hosts.get(host);
  if (!s) {
    s = { queue: Promise.resolve(), lastCallAt: 0, openUntil: 0, consecutiveTrips: 0 };
    hosts.set(host, s);
  }
  return s;
}

export class CircuitOpenError extends Error {
  constructor(host: string, msMore: number) {
    super(`${host} circuit open for another ${Math.ceil(msMore / 1000)}s (rate limited)`);
    this.name = "CircuitOpenError";
  }
}

export function circuitOpen(host: string) {
  const s = hosts.get(host);
  return Boolean(s && Date.now() < s.openUntil);
}

export function tripCircuit(host: string, retryAfterMs?: number) {
  const s = stateFor(host);
  s.consecutiveTrips = Math.min(s.consecutiveTrips + 1, 6);
  // 30s, 60s, 120s, 240s … capped at 15 minutes.
  const backoff = retryAfterMs ?? Math.min(30_000 * 2 ** (s.consecutiveTrips - 1), 900_000);
  s.openUntil = Date.now() + backoff;
}

function resetCircuit(host: string) {
  const s = stateFor(host);
  s.consecutiveTrips = 0;
  s.openUntil = 0;
}

/**
 * Runs `fn` serially per host with a minimum inter-call gap. Throws
 * CircuitOpenError immediately if the host is cooling down, so callers fall
 * back to the model without paying a network round trip.
 */
export function rateLimited<T>(host: string, minGapMs: number, fn: () => Promise<T>): Promise<T> {
  const s = stateFor(host);

  const now = Date.now();
  if (now < s.openUntil) {
    return Promise.reject(new CircuitOpenError(host, s.openUntil - now));
  }

  const run = async (): Promise<T> => {
    if (Date.now() < s.openUntil) {
      throw new CircuitOpenError(host, s.openUntil - Date.now());
    }
    const gap = Date.now() - s.lastCallAt;
    if (gap < minGapMs) {
      await new Promise((r) => setTimeout(r, minGapMs - gap));
    }
    s.lastCallAt = Date.now();
    try {
      const result = await fn();
      resetCircuit(host);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
        tripCircuit(host);
      }
      throw err;
    }
  };

  const chained = s.queue.then(run, run);
  // Keep the chain alive regardless of individual failures.
  s.queue = chained.then(
    () => undefined,
    () => undefined
  );
  return chained;
}

export function limiterStatus() {
  const now = Date.now();
  return [...hosts.entries()].map(([host, s]) => ({
    host,
    circuitOpen: now < s.openUntil,
    coolingDownMs: Math.max(0, s.openUntil - now),
    consecutiveTrips: s.consecutiveTrips,
  }));
}
