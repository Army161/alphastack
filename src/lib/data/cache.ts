/**
 * TTL cache with stale-while-revalidate and single-flight de-duplication.
 *
 * Every upstream call goes through this. Three properties matter:
 *   - One in-flight request per key, no matter how many callers arrive at once
 *   - Stale data is served instantly while a refresh runs in the background
 *   - A failed refresh never evicts good data; it extends the stale window
 */

type Entry<T> = {
  value: T;
  fetchedAt: number;
  ttlMs: number;
  staleUntil: number;
  error?: string;
};

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** How long a stale value may keep being served after its TTL expires. */
const STALE_GRACE_MS = 15 * 60 * 1000;

export type Cached<T> = {
  value: T;
  fresh: boolean;
  ageMs: number;
  error?: string;
};

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<Cached<T> | null> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;

  if (hit && now - hit.fetchedAt < hit.ttlMs) {
    return { value: hit.value, fresh: true, ageMs: now - hit.fetchedAt, error: hit.error };
  }

  // Stale but usable: kick off a background refresh and return immediately.
  if (hit && now < hit.staleUntil) {
    if (!inflight.has(key)) {
      const p = loader()
        .then((v) => {
          store.set(key, {
            value: v,
            fetchedAt: Date.now(),
            ttlMs,
            staleUntil: Date.now() + ttlMs + STALE_GRACE_MS,
          });
          return v;
        })
        .catch((err: unknown) => {
          // Keep the stale value alive rather than dropping to the model.
          const e = store.get(key);
          if (e) {
            e.staleUntil = Date.now() + STALE_GRACE_MS;
            e.error = err instanceof Error ? err.message : "refresh failed";
          }
          return hit.value;
        })
        .finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    return { value: hit.value, fresh: false, ageMs: now - hit.fetchedAt, error: hit.error };
  }

  // Cold, or too stale to serve: await a real fetch (single-flight).
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    try {
      const v = await existing;
      return { value: v, fresh: true, ageMs: 0 };
    } catch {
      return null;
    }
  }

  const p = loader()
    .then((v) => {
      store.set(key, {
        value: v,
        fetchedAt: Date.now(),
        ttlMs,
        staleUntil: Date.now() + ttlMs + STALE_GRACE_MS,
      });
      return v;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);

  try {
    const v = await p;
    return { value: v, fresh: true, ageMs: 0 };
  } catch {
    return null;
  }
}

export function cacheStats() {
  const now = Date.now();
  return [...store.entries()].map(([key, e]) => ({
    key,
    ageMs: now - e.fetchedAt,
    ttlMs: e.ttlMs,
    fresh: now - e.fetchedAt < e.ttlMs,
    error: e.error,
  }));
}

export function clearCache() {
  store.clear();
  inflight.clear();
}

/** fetch with a hard timeout so one slow upstream cannot stall a page render. */
export async function fetchJson<T>(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "AlphaStack/1.0",
        ...(rest.headers ?? {}),
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<string> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...rest,
      signal: controller.signal,
      headers: { "User-Agent": "AlphaStack/1.0", ...(rest.headers ?? {}) },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
