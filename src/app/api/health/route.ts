import { NextResponse } from "next/server";
import { PROVIDERS, type ProviderHealth } from "@/lib/data/providers/types";
import { ping as pingCoinGecko } from "@/lib/data/providers/coingecko";
import { pingOkx, pingHyperliquid } from "@/lib/data/providers/derivatives";
import { pingFred, pingSentiment, pingLlama } from "@/lib/data/providers/macro";
import { liveEnabled, getLive } from "@/lib/data/live";
import { cacheStats } from "@/lib/data/cache";
import { limiterStatus } from "@/lib/data/providers/limiter";
import { hasLlm } from "@/lib/agent/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Provider health. Every upstream is pinged concurrently so one slow host
 * cannot stall the check, and each result is independent — a red provider
 * degrades one block of the platform, never the whole thing.
 */
export async function GET() {
  const t0 = Date.now();

  const [cg, okx, hl, fred, fng, llama, live] = await Promise.all([
    pingCoinGecko(),
    pingOkx(),
    pingHyperliquid(),
    pingFred(),
    pingSentiment(),
    pingLlama(),
    getLive().catch(() => null),
  ]);

  const results: Record<string, { ok: boolean; latencyMs: number; error?: string }> = {
    coingecko: cg,
    okx,
    hyperliquid: hl,
    fred,
    "alternative.me": fng,
    defillama: llama,
  };

  const providers: ProviderHealth[] = Object.entries(PROVIDERS).map(([id, meta]) => {
    const r = results[id];
    const configured = meta.keyless || Boolean(meta.envKey && process.env[meta.envKey]);
    return {
      id: meta.id,
      label: meta.label,
      ok: r ? r.ok : configured ? false : false,
      latencyMs: r?.latencyMs ?? null,
      error: r?.error ?? (configured ? undefined : "not configured (optional)"),
      supplies: meta.supplies,
      keyless: meta.keyless,
      configured,
    };
  });

  const core = providers.filter((p) => p.keyless);
  const healthy = core.filter((p) => p.ok).length;

  return NextResponse.json(
    {
      status: healthy === core.length ? "ok" : healthy > 0 ? "degraded" : "model-only",
      liveDataEnabled: liveEnabled(),
      assetsPricedLive: live ? Object.keys(live.quotes).length : 0,
      agentSynthesis: hasLlm() ? "llm" : "local",
      providers,
      rateLimits: limiterStatus(),
      cache: cacheStats(),
      checkedInMs: Date.now() - t0,
      at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
