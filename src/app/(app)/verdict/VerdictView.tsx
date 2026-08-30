"use client";

import * as React from "react";
import { Check, Loader2, Quote, ScanLine, Sparkles, Target, TrendingDown, TrendingUp, X } from "lucide-react";
import type { KolScore, Prediction, ExtractedCall } from "@/lib/modules/verdict";
import { Card, CardHeader, Badge, Button, Textarea, Select, Stat, TabBar, Meter, EmptyState } from "@/components/ui/primitives";
import { HBarChart } from "@/components/charts";
import { fmtUsd, cn } from "@/lib/utils";

type Tab = "leaderboard" | "ledger" | "consensus" | "extract";

export function VerdictView({
  board,
  predictions,
  consensus,
}: {
  board: KolScore[];
  predictions: Prediction[];
  consensus: { asset: string; openCalls: number; avgTarget: number; spot: number; impliedUpside: number }[];
}) {
  const [tab, setTab] = React.useState<Tab>("leaderboard");
  const [filterKol, setFilterKol] = React.useState("all");
  const [filterStatus, setFilterStatus] = React.useState("all");

  const filtered = predictions
    .filter((p) => filterKol === "all" || p.kolId === filterKol)
    .filter((p) => filterStatus === "all" || p.status === filterStatus);

  const resolved = predictions.filter((p) => p.status !== "open");
  const hitRate = resolved.length
    ? (resolved.filter((p) => p.status === "hit").length / resolved.length) * 100
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><Stat label="Voices tracked" value={board.length} sub="Across YouTube, X, podcasts and research" /></Card>
        <Card><Stat label="Calls in ledger" value={predictions.length} sub={`${predictions.filter((p) => p.status === "open").length} still open`} /></Card>
        <Card><Stat label="Aggregate hit rate" value={`${hitRate.toFixed(0)}%`} accent={hitRate >= 50 ? "#22c55e" : "#ef4444"} sub={`${resolved.length} calls resolved against price history`} /></Card>
        <Card><Stat label="Permabulls" value={board.filter((b) => b.bias === "permabull").length} accent="#eab308" sub="Zero bearish calls on record" /></Card>
      </div>

      <Card className="overflow-hidden">
        <TabBar<Tab>
          tabs={[
            { id: "leaderboard", label: "Leaderboard", count: board.length },
            { id: "ledger", label: "Call ledger", count: predictions.length },
            { id: "consensus", label: "Consensus", count: consensus.length },
            { id: "extract", label: "Transcript extractor" },
          ]}
          value={tab}
          onChange={setTab}
          accent="#eab308"
        />

        {tab === "leaderboard" && (
          <div className="p-4">
            <p className="mb-4 text-[11.5px] leading-relaxed text-ink-500">
              Ranked by a blend of accuracy (55%) and calibration (45%). Calibration measures whether
              stated confidence matched the realised hit rate — a permabull with good accuracy in a
              bull market still scores poorly if every call was labelled &ldquo;high confidence&rdquo;.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px]">
                <thead>
                  <tr className="border-b border-ink-700/50 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                    <th className="px-2 py-2.5 text-left font-medium">#</th>
                    <th className="px-2 py-2.5 text-left font-medium">Voice</th>
                    <th className="px-2 py-2.5 text-right font-medium">Calls</th>
                    <th className="px-2 py-2.5 text-right font-medium">Resolved</th>
                    <th className="px-2 py-2.5 text-right font-medium">Accuracy</th>
                    <th className="px-2 py-2.5 text-right font-medium">Calibration</th>
                    <th className="px-2 py-2.5 text-right font-medium">Median err</th>
                    <th className="px-2 py-2.5 text-right font-medium">Brier</th>
                    <th className="px-2 py-2.5 text-right font-medium">Bias</th>
                    <th className="px-2 py-2.5 text-right font-medium">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((r) => (
                    <tr
                      key={r.kol.id}
                      className="cursor-pointer border-b border-ink-800/60 transition-colors hover:bg-ink-850/50"
                      onClick={() => { setFilterKol(r.kol.id); setTab("ledger"); }}
                    >
                      <td className="mono px-2 py-2.5 text-[12px] text-ink-500">{r.rank}</td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold"
                            style={{
                              background: `hsl(${r.kol.hue} 70% 50% / 0.18)`,
                              color: `hsl(${r.kol.hue} 75% 62%)`,
                            }}
                          >
                            {r.kol.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-[12.5px] font-medium text-ink-50">{r.kol.name}</div>
                            <div className="text-[10.5px] text-ink-500">
                              {r.kol.handle} · {(r.kol.followers / 1000).toFixed(0)}k
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-300">{r.total}</td>
                      <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-400">
                        {r.hits}/{r.resolved}
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <Meter
                            value={r.accuracy}
                            color={r.accuracy >= 60 ? "#22c55e" : r.accuracy >= 35 ? "#eab308" : "#ef4444"}
                            className="w-12"
                            height={4}
                          />
                          <span className="mono w-9 text-right text-[12px] text-ink-100">
                            {r.resolved ? `${r.accuracy}%` : "—"}
                          </span>
                        </div>
                      </td>
                      <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-200">
                        {r.resolved ? r.calibration.toFixed(0) : "—"}
                      </td>
                      <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-400">
                        {r.medianErrorPct ? `${r.medianErrorPct}%` : "—"}
                      </td>
                      <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-400">
                        {r.resolved ? r.brierScore.toFixed(3) : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Badge tone={r.bias === "permabull" ? "warn" : r.bias === "permabear" ? "info" : "neutral"}>
                          {r.bias}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <Badge
                          tone={
                            r.grade === "—" ? "neutral"
                              : ["A", "B"].includes(r.grade) ? "pos"
                              : r.grade === "C" ? "warn"
                              : "neg"
                          }
                        >
                          {r.grade === "—" ? "unrated" : r.grade}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 border-t border-ink-700/50 pt-4">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-500">
                Accuracy on resolved calls
              </div>
              <HBarChart
                data={board
                  .filter((b) => b.resolved > 0)
                  .map((b) => ({
                    name: b.kol.name.split(" ")[0],
                    value: b.accuracy,
                    color: b.accuracy >= 60 ? "#22c55e" : b.accuracy >= 35 ? "#eab308" : "#ef4444",
                  }))}
                domain={[0, 100]}
                height={Math.max(140, board.filter((b) => b.resolved > 0).length * 30 + 40)}
              />
            </div>
          </div>
        )}

        {tab === "ledger" && (
          <div className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Select value={filterKol} onChange={(e) => setFilterKol(e.target.value)}>
                <option value="all">All voices</option>
                {board.map((b) => (
                  <option key={b.kol.id} value={b.kol.id}>{b.kol.name}</option>
                ))}
              </Select>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="all">All statuses</option>
                <option value="open">Open</option>
                <option value="hit">Hit</option>
                <option value="miss">Miss</option>
              </Select>
              <span className="ml-auto text-[11.5px] text-ink-500">{filtered.length} calls</span>
            </div>

            <div className="space-y-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "rounded-xl border p-3.5",
                    p.status === "hit"
                      ? "border-green-500/25 bg-green-500/[0.04]"
                      : p.status === "miss"
                        ? "border-red-500/25 bg-red-500/[0.04]"
                        : "border-ink-700/60 bg-ink-850/30"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{p.asset}</Badge>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[12px] font-medium",
                        p.direction === "up" ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {p.direction === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {p.targetPrice
                        ? fmtUsd(p.targetPrice, { dp: p.targetPrice < 10 ? 2 : 0 })
                        : p.direction}
                    </span>
                    <span className="mono text-[11px] text-ink-500">
                      from {fmtUsd(p.priceAtCall, { dp: p.priceAtCall < 10 ? 2 : 0 })}
                    </span>
                    {p.targetPrice && (
                      <span className="mono text-[11px] text-ink-400">
                        {(p.targetPrice / p.priceAtCall).toFixed(1)}x
                      </span>
                    )}
                    <Badge
                      tone={p.status === "hit" ? "pos" : p.status === "miss" ? "neg" : "info"}
                      className="ml-auto"
                    >
                      {p.status}
                    </Badge>
                    <Badge tone={p.confidence === "high" ? "warn" : "neutral"}>{p.confidence}</Badge>
                  </div>

                  <div className="mt-2.5 flex items-start gap-2">
                    <Quote size={12} className="mt-0.5 shrink-0 text-ink-600" />
                    <p className="text-[12px] italic leading-relaxed text-ink-300">
                      &ldquo;{p.quote}&rdquo;
                    </p>
                  </div>

                  <div className="mono mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-ink-500">
                    <span>{p.kolName}</span>
                    <span>made {p.madeOn}</span>
                    <span>deadline {p.deadline}</span>
                    {p.resolvedPrice != null && (
                      <span>resolved at {fmtUsd(p.resolvedPrice, { dp: p.resolvedPrice < 10 ? 2 : 0 })}</span>
                    )}
                    {p.errorPct != null && (
                      <span className={p.errorPct >= 0 ? "text-green-400" : "text-red-400"}>
                        error {p.errorPct > 0 ? "+" : ""}{p.errorPct}%
                      </span>
                    )}
                    <span className="text-ink-600">{p.sourceTitle}</span>
                  </div>
                </div>
              ))}
              {!filtered.length && (
                <EmptyState title="No calls match" body="Adjust the filters to see more of the ledger." />
              )}
            </div>
          </div>
        )}

        {tab === "consensus" && (
          <div className="p-4">
            <p className="mb-4 text-[11.5px] leading-relaxed text-ink-500">
              Average target across all open calls per asset, against spot. High implied upside with
              many open calls is a crowded narrative — that is information, not confirmation.
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {consensus.map((c) => (
                <div key={c.asset} className="rounded-xl border border-ink-700/60 bg-ink-850/30 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold text-ink-50">{c.asset}</span>
                    <Badge tone="neutral">{c.openCalls} open</Badge>
                    <span
                      className={cn(
                        "mono ml-auto text-[14px] font-semibold",
                        c.impliedUpside > 0 ? "text-green-400" : "text-red-400"
                      )}
                    >
                      {c.impliedUpside > 0 ? "+" : ""}
                      {c.impliedUpside.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mono mt-2 flex justify-between text-[11.5px] text-ink-400">
                    <span>spot {fmtUsd(c.spot, { dp: c.spot < 10 ? 2 : 0 })}</span>
                    <span>avg target {fmtUsd(c.avgTarget, { dp: c.avgTarget < 10 ? 2 : 0 })}</span>
                  </div>
                  <Meter
                    value={Math.min(100, Math.abs(c.impliedUpside) / 4)}
                    color={c.impliedUpside > 0 ? "#22c55e" : "#ef4444"}
                    className="mt-2.5"
                    height={4}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "extract" && <Extractor />}
      </Card>
    </div>
  );
}

function Extractor() {
  const [text, setText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<{ extracted: number; falsifiable: number; calls: ExtractedCall[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/v1/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "extract_calls_from_transcript", input: { transcript: text } }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Extraction failed");
      setResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4">
      <div className="mb-3 rounded-lg border border-ink-700/60 bg-ink-850/40 p-3.5">
        <div className="flex items-center gap-2">
          <ScanLine size={13} className="text-amber-400" />
          <span className="text-[12.5px] font-medium text-ink-100">
            This is the automation that populates the ledger
          </span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
          Paste any transcript, podcast text or article. The extractor finds every falsifiable,
          dated, numeric prediction — asset, direction, target, timeframe, stated confidence and the
          verbatim quote. Run it across a channel&rsquo;s back catalogue and you have a track record
          nobody else is keeping.
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={9}
        placeholder="Paste a transcript here… e.g. &ldquo;Leading up to midterms, I could see us getting back to $100,000 for Bitcoin. And I think Solana does a 5 to 10x by 2030.&rdquo;"
        className="text-[12.5px]"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={run} disabled={busy || text.trim().length < 40}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {busy ? "Extracting…" : "Extract calls"}
        </Button>
        {text && (
          <Button variant="ghost" onClick={() => { setText(""); setResult(null); }}>
            <X size={13} /> Clear
          </Button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[12px] text-red-300">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge tone="brand">{result.extracted} calls found</Badge>
            <Badge tone="pos">{result.falsifiable} fully falsifiable</Badge>
            <Badge tone="neutral">
              {result.extracted - result.falsifiable} missing a target or timeframe
            </Badge>
          </div>

          {result.calls.length === 0 ? (
            <EmptyState
              title="No falsifiable calls found"
              body="The text contained no dated, numeric predictions about a tracked asset. Vague directional talk is deliberately excluded — it cannot be scored."
            />
          ) : (
            <div className="space-y-2">
              {result.calls.map((c, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-3.5",
                    c.falsifiable
                      ? "border-green-500/25 bg-green-500/[0.04]"
                      : "border-ink-700/60 bg-ink-850/30"
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{c.asset}</Badge>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[12px] font-medium",
                        c.direction === "up" ? "text-green-400" : c.direction === "down" ? "text-red-400" : "text-ink-400"
                      )}
                    >
                      {c.direction === "up" ? <TrendingUp size={12} /> : c.direction === "down" ? <TrendingDown size={12} /> : <Target size={12} />}
                      {c.direction}
                    </span>
                    {c.targetPrice != null && (
                      <span className="mono text-[12px] text-ink-100">
                        {fmtUsd(c.targetPrice, { dp: c.targetPrice < 10 ? 2 : 0 })}
                      </span>
                    )}
                    {c.timeframe && <Badge tone="info">{c.timeframe}</Badge>}
                    <Badge tone={c.confidence === "high" ? "warn" : "neutral"}>{c.confidence}</Badge>
                    {c.falsifiable ? (
                      <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-green-400">
                        <Check size={11} /> resolvable
                      </span>
                    ) : (
                      <span className="ml-auto text-[11px] text-ink-500">not resolvable</span>
                    )}
                  </div>
                  <p className="mt-2 text-[11.5px] italic leading-relaxed text-ink-400">
                    &ldquo;{c.quote}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
