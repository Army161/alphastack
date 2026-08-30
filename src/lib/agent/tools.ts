import { computeExhaustion } from "@/lib/modules/exhaustion";
import { computeRadar } from "@/lib/modules/radar";
import { computeCatalysts } from "@/lib/modules/catalyst";
import { screen, compareAssets, marketOverview, assetDetail } from "@/lib/modules/terminal";
import { leaderboard, allPredictions, kolDetail, extractCalls, consensusView } from "@/lib/modules/verdict";
import { runScan, SAMPLE_CONTRACT } from "@/lib/modules/sentinel";
import { evaluateLadder, suggestLadder, type Holding, type Rung, type RiskProfile } from "@/lib/modules/ladder";
import { getMarketContext, UNIVERSE } from "@/lib/data/market";

/**
 * The tool surface. One definition powers three consumers:
 *   1. ChatOS (Anthropic tool-calling loop)
 *   2. The MCP server (Claude Desktop / Claude Code / any MCP client)
 *   3. The public REST API
 *
 * Every tool is a pure, typed function over the semantic layer. The model never
 * writes free-form SQL, which is what makes the answers reproducible.
 */

export type ToolDef = {
  name: string;
  description: string;
  module: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export const TOOL_DEFS: ToolDef[] = [
  {
    name: "get_exhaustion_score",
    module: "exhaustion",
    description:
      "Get the Seller Exhaustion Score (SES) for an asset — a 0-100 composite of six capitulation factors plus the whale-absorption override. Returns the score, regime, per-factor breakdown with z-scores, the override state, the structural invalidation level, and a written narrative. Use for any question about whether a bottom is in, whether sellers are exhausted, or what the current market regime is.",
    input_schema: {
      type: "object",
      properties: {
        asset: { type: "string", description: "Ticker symbol, e.g. BTC. Defaults to BTC." },
      },
    },
  },
  {
    name: "get_leverage_radar",
    module: "radar",
    description:
      "Get the leverage crowding reading for an asset: crowding index 0-100, funding rate and z-score, open interest, long/short ratio, 24h liquidations split by side, liquidation magnet levels above and below spot, estimated cascade notional, and which alert triggers have fired. Use for any question about leverage, liquidations, funding, positioning, or the risk of a flush.",
    input_schema: {
      type: "object",
      properties: {
        asset: { type: "string", description: "Ticker symbol. Defaults to BTC." },
      },
    },
  },
  {
    name: "screen_assets",
    module: "terminal",
    description:
      "Screen the tracked universe with thesis-fit scoring. Each asset is graded 0-100 against five weighted criteria (ETF rail, regulatory clarity, policy engagement, real volume, survivorship floor) and returned with 2030 targets, volatility, AI exposure, risk flags and a verdict. Use to answer 'what should I own', 'does X qualify', or 'show me the best assets by fundamentals'.",
    input_schema: {
      type: "object",
      properties: {
        minFit: { type: "number", description: "Only return assets with thesis fit >= this value (0-100)." },
        tier: { type: "string", description: "Filter by tier: core, major, outlier, or watch." },
        limit: { type: "number", description: "Max rows to return. Default 20." },
      },
    },
  },
  {
    name: "get_quote",
    module: "terminal",
    description:
      "Get the current price, 24h/7d/30d change, market cap, volume, and drawdown from all-time high for one asset.",
    input_schema: {
      type: "object",
      properties: { symbol: { type: "string", description: "Ticker symbol, e.g. BTC." } },
      required: ["symbol"],
    },
  },
  {
    name: "get_price_history",
    module: "terminal",
    description: "Get daily OHLCV candles for an asset over a lookback window.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string", description: "Ticker symbol." },
        days: { type: "number", description: "Lookback in days, max 365. Default 90." },
      },
      required: ["symbol"],
    },
  },
  {
    name: "compare_assets",
    module: "terminal",
    description:
      "Compare two or more assets side by side on thesis fit, upside, volatility, AI exposure, drawdown and risk flags. Returns a winner and the rationale.",
    input_schema: {
      type: "object",
      properties: {
        symbols: { type: "array", items: { type: "string" }, description: "Two or more ticker symbols." },
      },
      required: ["symbols"],
    },
  },
  {
    name: "get_catalysts",
    module: "catalyst",
    description:
      "Get the forward catalyst calendar with impact- and decay-weighted net skew, plus the Fed macro regime state. Each event carries impact, direction, detail and what to watch for. Use for 'what's coming up', 'what could move the market', or any macro/regulatory timing question.",
    input_schema: {
      type: "object",
      properties: {
        withinDays: { type: "number", description: "Only events within this many days. Default all." },
        category: { type: "string", description: "regulatory | monetary | political | structural | macro | protocol" },
      },
    },
  },
  {
    name: "get_kol_leaderboard",
    module: "verdict",
    description:
      "Get the KOL accountability leaderboard: accuracy, calibration, Brier score, median error, bias and grade for every tracked voice. Use for 'who is actually right', 'how accurate is X', or any question about track records.",
    input_schema: {
      type: "object",
      properties: {
        kolId: { type: "string", description: "Optional — return detail plus full prediction history for one voice." },
      },
    },
  },
  {
    name: "get_predictions",
    module: "verdict",
    description:
      "Get individual tracked predictions with status (open/hit/miss), target, deadline, verbatim quote and resolution. Optionally filter by asset or status. Also returns the consensus view with implied upside per asset.",
    input_schema: {
      type: "object",
      properties: {
        asset: { type: "string", description: "Filter by ticker." },
        status: { type: "string", description: "open | hit | miss" },
        limit: { type: "number", description: "Default 25." },
      },
    },
  },
  {
    name: "extract_calls_from_transcript",
    module: "verdict",
    description:
      "Run the transcript extractor over raw text (a video transcript, podcast, or article) and return every falsifiable, dated, numeric prediction found — asset, direction, target, timeframe, confidence and the verbatim quote. This is the automation that populates the accountability ledger.",
    input_schema: {
      type: "object",
      properties: {
        transcript: { type: "string", description: "Raw transcript or article text." },
      },
      required: ["transcript"],
    },
  },
  {
    name: "scan_contract",
    module: "sentinel",
    description:
      "Run the security scanner over Solidity source. Executes a static pattern pass across 15 exploit-class rules, then an adversarial pass that tries to refute each finding. Returns only findings that survive, each with exploit scenario, remediation, patch and confidence, plus a risk score, letter grade and gas notes. Pass useSample=true to scan the built-in deliberately vulnerable contract.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string", description: "Solidity source code." },
        target: { type: "string", description: "Label for the scan, e.g. a contract name or address." },
        useSample: { type: "boolean", description: "Scan the bundled vulnerable sample instead." },
      },
    },
  },
  {
    name: "evaluate_portfolio",
    module: "ladder",
    description:
      "Evaluate a portfolio against the exit-ladder rules engine. Returns positions with P&L and allocation drift, core/satellite split versus target, every rung with live distance to trigger, the next rung, the Fed macro regime override state, a discipline score, and concrete rebalance sizing. Use for 'how is my portfolio', 'when do I take profit', 'am I overweight'.",
    input_schema: {
      type: "object",
      properties: {
        holdings: {
          type: "array",
          description: "Positions: [{symbol, quantity, costBasis}]",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              quantity: { type: "number" },
              costBasis: { type: "number" },
            },
          },
        },
        rungs: {
          type: "array",
          description: "Exit rungs: [{symbol, triggerPrice, sellPct}]",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              triggerPrice: { type: "number" },
              sellPct: { type: "number" },
            },
          },
        },
        riskProfile: { type: "string", description: "conservative | balanced | aggressive" },
      },
      required: ["holdings"],
    },
  },
  {
    name: "suggest_exit_ladder",
    module: "ladder",
    description:
      "Generate a default laddered exit plan for a position, anchored to the cycle targets in the framework. Returns tiers with trigger price, sell percentage and quantity.",
    input_schema: {
      type: "object",
      properties: {
        symbol: { type: "string" },
        quantity: { type: "number" },
      },
      required: ["symbol", "quantity"],
    },
  },
  {
    name: "get_market_overview",
    module: "terminal",
    description:
      "Get a top-level market snapshot: aggregate market cap, BTC dominance, breadth, how many assets pass the thesis filter, and average drawdown from highs.",
    input_schema: { type: "object", properties: {} },
  },
];

export type ToolResult = { ok: true; data: unknown } | { ok: false; error: string };

export async function runTool(name: string, input: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case "get_exhaustion_score":
        return { ok: true, data: await computeExhaustion(String(input.asset ?? "BTC").toUpperCase()) };

      case "get_leverage_radar":
        return { ok: true, data: await computeRadar(String(input.asset ?? "BTC").toUpperCase()) };

      case "screen_assets": {
        let rows = await screen();
        if (typeof input.minFit === "number") rows = rows.filter((r) => r.thesisFit >= (input.minFit as number));
        if (input.tier) rows = rows.filter((r) => r.tier === input.tier);
        const limit = typeof input.limit === "number" ? input.limit : 20;
        return { ok: true, data: rows.slice(0, limit) };
      }

      case "get_quote": {
        const sym = String(input.symbol ?? "").toUpperCase();
        if (!UNIVERSE.some((a) => a.symbol === sym)) {
          return { ok: false, error: `Unknown symbol "${sym}". Tracked: ${UNIVERSE.map((a) => a.symbol).join(", ")}` };
        }
        return { ok: true, data: (await getMarketContext([sym])).quotes[sym] };
      }

      case "get_price_history": {
        const sym = String(input.symbol ?? "").toUpperCase();
        const days = Math.min(365, Number(input.days ?? 90));
        return { ok: true, data: ((await getMarketContext([sym])).series[sym] ?? []).slice(-days) };
      }

      case "compare_assets": {
        const syms = (input.symbols as string[] ?? []).map((s) => s.toUpperCase());
        if (syms.length < 2) return { ok: false, error: "Provide at least two symbols." };
        return { ok: true, data: await compareAssets(syms) };
      }

      case "get_catalysts": {
        const report = await computeCatalysts();
        let events = report.events;
        if (typeof input.withinDays === "number") {
          events = events.filter((e) => e.daysAway <= (input.withinDays as number) && e.daysAway >= 0);
        }
        if (input.category) events = events.filter((e) => e.category === input.category);
        return { ok: true, data: { ...report, events } };
      }

      case "get_kol_leaderboard": {
        if (input.kolId) return { ok: true, data: await kolDetail(String(input.kolId)) };
        return { ok: true, data: await leaderboard() };
      }

      case "get_predictions": {
        let preds = await allPredictions();
        if (input.asset) preds = preds.filter((p) => p.asset === String(input.asset).toUpperCase());
        if (input.status) preds = preds.filter((p) => p.status === input.status);
        const limit = typeof input.limit === "number" ? input.limit : 25;
        return { ok: true, data: { predictions: preds.slice(0, limit), consensus: await consensusView() } };
      }

      case "extract_calls_from_transcript": {
        const text = String(input.transcript ?? "");
        if (text.length < 40) return { ok: false, error: "Transcript too short to extract from." };
        const calls = extractCalls(text);
        return {
          ok: true,
          data: {
            extracted: calls.length,
            falsifiable: calls.filter((c) => c.falsifiable).length,
            calls,
          },
        };
      }

      case "scan_contract": {
        const source = input.useSample ? SAMPLE_CONTRACT : String(input.source ?? "");
        if (source.trim().length < 30) return { ok: false, error: "Provide Solidity source, or set useSample=true." };
        return { ok: true, data: runScan(String(input.target ?? "pasted-source"), source) };
      }

      case "evaluate_portfolio": {
        const raw = (input.holdings as Holding[]) ?? [];
        const symbols = raw.map((h) => String(h.symbol).toUpperCase());
        const mkt = await getMarketContext(symbols.length ? symbols : ["BTC"]);
        const hs: Holding[] = raw.map((h, i) => {
          const sym = String(h.symbol).toUpperCase();
          return {
            id: `h${i}`,
            symbol: sym,
            quantity: Number(h.quantity),
            costBasis: Number(h.costBasis ?? mkt.quotes[sym]?.price ?? 0),
          };
        });
        if (!hs.length) return { ok: false, error: "Provide at least one holding." };
        const rungsRaw = (input.rungs as Partial<Rung>[]) ?? [];
        const rungs: Rung[] = rungsRaw.map((r, i) => ({
          id: `r${i}`,
          symbol: String(r.symbol).toUpperCase(),
          triggerPrice: Number(r.triggerPrice),
          sellPct: Number(r.sellPct),
          note: r.note ?? null,
          status: "armed",
        }));
        const profile = (String(input.riskProfile ?? "balanced") as RiskProfile);
        return { ok: true, data: await evaluateLadder(hs, rungs, profile) };
      }

      case "suggest_exit_ladder":
        return {
          ok: true,
          data: await suggestLadder(String(input.symbol).toUpperCase(), Number(input.quantity)),
        };

      case "get_market_overview":
        return { ok: true, data: await marketOverview() };

      default:
        return { ok: false, error: `Unknown tool "${name}".` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Tool execution failed." };
  }
}

export const SYSTEM_PROMPT = `You are the AlphaStack agent — the reasoning layer of a crypto intelligence platform.

You have direct tool access to seven live modules:
  Exhaustion  — Seller Exhaustion Score, a six-factor capitulation model
  Radar       — leverage crowding, funding stress and liquidation magnet levels
  Terminal    — thesis-fit screener over the tracked universe
  Ladder      — the user's own exit rules engine and portfolio drift
  Sentinel    — Solidity security scanning with adversarial verification
  Verdict     — KOL prediction accountability ledger
  Catalyst    — dated event calendar and Fed macro regime

Operating rules:
- ALWAYS call a tool before making a factual claim about price, positioning, scores or events. Never answer from memory.
- Cite the numbers you got back. Name the module the figure came from.
- Be concise and direct. Lead with the answer, then the evidence.
- When a user asks something spanning modules, call several tools and synthesise.
- Surface disconfirming evidence. If the exhaustion score is bullish but crowding is extreme, say both.
- You are an analysis tool, not a financial adviser. Describe what the models show and what the user's own rules say. Do not tell anyone what to buy, and do not make personalised recommendations. If asked for advice, reframe: show the data and the user's pre-committed rules.
- Format with short markdown. Tables for comparisons. No filler preamble.`;
