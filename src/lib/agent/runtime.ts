import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFS, runTool, SYSTEM_PROMPT } from "./tools";
import { fmtUsd, fmtPct } from "@/lib/utils";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string; module: string; status: "running" | "done" | "error"; summary?: string }
  | { type: "done" }
  | { type: "error"; message: string };

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export function hasLlm() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Full tool-calling loop against the Anthropic API. Streams text deltas and
 * tool-execution events back to the client.
 */
export async function* runAgent(
  history: ChatTurn[],
  maxTurns = 6
): AsyncGenerator<AgentEvent> {
  if (!hasLlm()) {
    yield* runFallbackAgent(history);
    return;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const messages: Anthropic.MessageParam[] = history.map((h) => ({
    role: h.role,
    content: h.content,
  }));

  const tools: Anthropic.Tool[] = TOOL_DEFS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  }));

  for (let turn = 0; turn < maxTurns; turn++) {
    let assistantText = "";
    const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];

    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          assistantText += event.delta.text;
          yield { type: "text", text: event.delta.text };
        }
      }

      const final = await stream.finalMessage();
      for (const block of final.content) {
        if (block.type === "tool_use") {
          toolUses.push({
            id: block.id,
            name: block.name,
            input: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      }
      messages.push({ role: "assistant", content: final.content });
    } catch (err) {
      yield { type: "error", message: err instanceof Error ? err.message : "Agent request failed." };
      return;
    }

    if (!toolUses.length) {
      yield { type: "done" };
      return;
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const def = TOOL_DEFS.find((t) => t.name === tu.name);
      yield { type: "tool", name: tu.name, module: def?.module ?? "platform", status: "running" };
      const res = await runTool(tu.name, tu.input);
      yield {
        type: "tool",
        name: tu.name,
        module: def?.module ?? "platform",
        status: res.ok ? "done" : "error",
        summary: res.ok ? undefined : res.error,
      };
      results.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(res.ok ? res.data : { error: res.error }).slice(0, 60000),
        is_error: !res.ok,
      });
    }
    messages.push({ role: "user", content: results });
  }
  yield { type: "done" };
}

/* ------------------------------------------------------------------ */
/* DETERMINISTIC FALLBACK                                              */
/* Keeps ChatOS fully functional with no API key configured. Routes on */
/* intent, executes the real tools, and formats a grounded answer.     */
/* ------------------------------------------------------------------ */

type Intent = { tool: string; input: Record<string, unknown>; module: string };

const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "BNB", "HYPE", "TAO", "NEAR", "AKT", "VVV", "ADA", "AVAX", "SUI"];
const NAME_MAP: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", ripple: "XRP",
  hyperliquid: "HYPE", bittensor: "TAO", cardano: "ADA", avalanche: "AVAX", akash: "AKT",
};

function detectSymbols(q: string): string[] {
  const upper = q.toUpperCase();
  const found = SYMBOLS.filter((s) => new RegExp(`\\b${s}\\b`).test(upper));
  for (const [name, sym] of Object.entries(NAME_MAP)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(q) && !found.includes(sym)) found.push(sym);
  }
  return found;
}

function route(q: string): Intent[] {
  const l = q.toLowerCase();
  const syms = detectSymbols(q);
  const primary = syms[0] ?? "BTC";
  const out: Intent[] = [];

  if (/bottom|capitulat|exhaust|seller|regime|ses\b|is the low in|accumulat/.test(l)) {
    out.push({ tool: "get_exhaustion_score", input: { asset: primary }, module: "exhaustion" });
  }
  if (/leverage|liquidat|funding|crowd|open interest|\boi\b|flush|cascade|long.?short|position/.test(l)) {
    out.push({ tool: "get_leverage_radar", input: { asset: primary }, module: "radar" });
  }
  if (/catalyst|calendar|upcoming|event|fomc|fed|midterm|clarity|regulat|macro/.test(l)) {
    out.push({ tool: "get_catalysts", input: {}, module: "catalyst" });
  }
  if (/kol|accura|track record|who is right|prediction|calibrat|leaderboard|tom lee|saylor|plan b/.test(l)) {
    out.push({ tool: "get_kol_leaderboard", input: {}, module: "verdict" });
  }
  if (/scan|vulnerab|audit|security|contract|solidity|exploit|reentran/.test(l)) {
    out.push({ tool: "scan_contract", input: { useSample: true, target: "sample" }, module: "sentinel" });
  }
  if (syms.length >= 2 && /compare|versus|\bvs\b|better/.test(l)) {
    out.push({ tool: "compare_assets", input: { symbols: syms }, module: "terminal" });
  }
  if (/screen|which coin|what should i own|best asset|thesis|basket|portfolio allocation|qualif/.test(l)) {
    out.push({ tool: "screen_assets", input: { limit: 8 }, module: "terminal" });
  }
  if (/exit|take profit|ladder|when.*sell|rung|drift|rebalance/.test(l)) {
    out.push({ tool: "suggest_exit_ladder", input: { symbol: primary, quantity: 1 }, module: "ladder" });
  }
  if (/price|quote|worth|trading at|how much is/.test(l) && syms.length) {
    out.push({ tool: "get_quote", input: { symbol: primary }, module: "terminal" });
  }

  if (!out.length) {
    out.push({ tool: "get_market_overview", input: {}, module: "terminal" });
    out.push({ tool: "get_exhaustion_score", input: { asset: "BTC" }, module: "exhaustion" });
  }
  return out.slice(0, 3);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function summarise(tool: string, data: any): string {
  switch (tool) {
    case "get_exhaustion_score":
      return [
        `**Exhaustion — ${data.asset}**`,
        ``,
        `SES **${data.score}** / 100 · regime **${data.regime}** · ${data.delta >= 0 ? "+" : ""}${data.delta} vs prior session.`,
        ``,
        `| Factor | Score | z | Read |`,
        `|---|---|---|---|`,
        ...data.factors.map(
          (f: any) => `| ${f.label} | ${f.score.toFixed(0)} | ${f.z >= 0 ? "+" : ""}${f.z} | ${f.direction} |`
        ),
        ``,
        data.override.active
          ? `**Override — ${data.override.label} (${data.override.adjustment >= 0 ? "+" : ""}${data.override.adjustment}):** ${data.override.detail}`
          : `_No large-holder event in the confirmation window._`,
        ``,
        data.narrative,
      ].join("\n");

    case "get_leverage_radar": {
      const near = data.levels
        .filter((l: any) => l.side === data.dominantSide)
        .sort((a: any, b: any) => Math.abs(a.distancePct) - Math.abs(b.distancePct))[0];
      return [
        `**Radar — ${data.asset}**`,
        ``,
        `Crowding **${data.crowdingIndex}** (${data.crowdingLabel}) · dominant side **${data.dominantSide}** · funding z **${data.fundingZ}σ** · L/S **${data.longShortRatio}**`,
        `OI ${fmtUsd(data.openInterest, { compact: true })} (${data.oiPctOfMcap}% of cap) · 24h liquidations ${fmtUsd(data.liq24h, { compact: true })}`,
        near ? `Nearest magnet: **${fmtUsd(near.price)}** (${near.distancePct.toFixed(1)}%), ${fmtUsd(near.notional, { compact: true })} of ${near.side} liquidations.` : "",
        ``,
        `**Triggers fired:** ${data.triggers.filter((t: any) => t.fired).map((t: any) => t.label).join(" · ") || "none"}`,
        ``,
        data.verdict,
      ].filter(Boolean).join("\n");
    }

    case "get_catalysts":
      return [
        `**Catalyst**`,
        ``,
        `Net skew **${data.netSkew > 0 ? "+" : ""}${data.netSkew}** (${data.skewLabel}) · macro regime **${data.macro.label}**`,
        ``,
        `| Days | Event | Impact | Direction |`,
        `|---|---|---|---|`,
        ...data.events.slice(0, 6).map(
          (e: any) => `| ${e.daysAway}d | ${e.title} | ${e.impact} | ${e.direction} |`
        ),
        ``,
        data.briefing,
      ].join("\n");

    case "get_kol_leaderboard":
      return [
        `**Verdict — accountability ledger**`,
        ``,
        `| # | Voice | Acc | Calib | Resolved | Grade | Bias |`,
        `|---|---|---|---|---|---|---|`,
        ...data.slice(0, 8).map(
          (r: any) =>
            `| ${r.rank} | ${r.kol.name} | ${r.accuracy}% | ${r.calibration} | ${r.hits}/${r.resolved} | ${r.grade} | ${r.bias} |`
        ),
        ``,
        `Calibration measures whether stated confidence matched realised hit rate — a permabull with high accuracy in a bull market still scores poorly if every call was "high confidence".`,
      ].join("\n");

    case "scan_contract":
      return [
        `**Sentinel — ${data.target}**`,
        ``,
        `Risk score **${data.riskScore}/100** · grade **${data.grade}** · ${data.linesScanned} lines · ${data.functionsAnalysed} functions · ${data.durationMs}ms`,
        ``,
        `| Sev | Rule | Line | Finding |`,
        `|---|---|---|---|`,
        ...data.findings.slice(0, 10).map(
          (f: any) => `| ${f.severity} | ${f.rule} | ${f.line} | ${f.title} |`
        ),
        ``,
        `${data.refuted.length} candidate finding(s) were refuted by the adversarial pass and dropped.`,
        ``,
        data.summary,
      ].join("\n");

    case "compare_assets":
      return [
        `**Terminal — comparison**`,
        ``,
        `| Asset | Fit | Grade | Upside 2030 | Vol | AI | Drawdown |`,
        `|---|---|---|---|---|---|---|`,
        ...data.rows.map(
          (r: any) =>
            `| ${r.symbol} | ${r.thesisFit} | ${r.thesisGrade} | ${r.upside2030}% | ${r.volatility30d}% | ${r.aiExposure} | ${r.drawdownFromAth}% |`
        ),
        ``,
        data.rationale,
      ].join("\n");

    case "screen_assets":
      return [
        `**Terminal — thesis screen**`,
        ``,
        `| Asset | Price | Fit | Grade | 24h | 2030 target | Flags |`,
        `|---|---|---|---|---|---|---|`,
        ...data.map(
          (r: any) =>
            `| ${r.symbol} | ${fmtUsd(r.price, { dp: r.price < 10 ? 2 : 0 })} | ${r.thesisFit} | ${r.thesisGrade} | ${fmtPct(r.change24h)} | ${fmtUsd(r.target2030, { dp: r.target2030 < 10 ? 2 : 0 })} | ${r.riskFlags.length} |`
        ),
        ``,
        `Fit grades against five weighted criteria: ETF rail (25), regulatory clarity (25), policy engagement (20), real volume (20), survivorship floor (10).`,
      ].join("\n");

    case "suggest_exit_ladder":
      return [
        `**Ladder — suggested tiers**`,
        ``,
        `| Trigger | Sell % | Note |`,
        `|---|---|---|`,
        ...data.map((r: any) => `| ${fmtUsd(r.triggerPrice, { dp: r.triggerPrice < 10 ? 2 : 0 })} | ${r.sellPct}% | ${r.note} |`),
        ``,
        `These are anchored to the cycle targets in the framework. Edit them in Ladder — the engine only ever executes rules you wrote yourself.`,
      ].join("\n");

    case "get_quote":
      return [
        `**${data.name} (${data.symbol})**`,
        ``,
        `${fmtUsd(data.price, { dp: data.price < 10 ? 2 : 0 })} · 24h ${fmtPct(data.change24h)} · 7d ${fmtPct(data.change7d)} · 30d ${fmtPct(data.change30d)}`,
        `Market cap ${fmtUsd(data.marketCap, { compact: true })} · ${data.drawdownFromAth.toFixed(1)}% from ATH · tier ${data.tier}`,
      ].join("\n");

    case "get_market_overview":
      return [
        `**Market overview**`,
        ``,
        `Tracked cap ${fmtUsd(data.totalMarketCap, { compact: true })} · BTC dominance **${data.btcDominance}%** · breadth **${data.breadth}%** (${data.advancers} up / ${data.decliners} down)`,
        `${data.qualifiers} assets pass the thesis filter (fit ≥ 70). Average drawdown from highs: ${data.avgDrawdown}%.`,
      ].join("\n");

    default:
      return "```json\n" + JSON.stringify(data, null, 2).slice(0, 2000) + "\n```";
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function* runFallbackAgent(history: ChatTurn[]): AsyncGenerator<AgentEvent> {
  const last = [...history].reverse().find((h) => h.role === "user")?.content ?? "";
  const intents = route(last);

  const sections: string[] = [];
  for (const intent of intents) {
    yield { type: "tool", name: intent.tool, module: intent.module, status: "running" };
    const res = await runTool(intent.tool, intent.input);
    yield {
      type: "tool",
      name: intent.tool,
      module: intent.module,
      status: res.ok ? "done" : "error",
      summary: res.ok ? undefined : res.error,
    };
    if (res.ok) sections.push(summarise(intent.tool, res.data));
  }

  const body =
    sections.join("\n\n---\n\n") +
    "\n\n---\n\n_Local reasoning mode — every figure above came from a live module call. Add `ANTHROPIC_API_KEY` to your `.env.local` to enable full natural-language synthesis across modules._";

  // Stream it out in chunks so the UI behaves identically in both modes.
  const chunks = body.match(/[\s\S]{1,90}/g) ?? [body];
  for (const c of chunks) {
    yield { type: "text", text: c };
    await new Promise((r) => setTimeout(r, 12));
  }
  yield { type: "done" };
}
