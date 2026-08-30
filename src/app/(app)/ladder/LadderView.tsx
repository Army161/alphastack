"use client";

import * as React from "react";
import {
  AlertTriangle, Check, Plus, Trash2, TrendingUp, Wand2, X, Landmark, Target,
} from "lucide-react";
import type { LadderReport } from "@/lib/modules/ladder";
import { ALLOCATION_PROFILES } from "@/lib/modules/ladder";
import { Card, CardHeader, Badge, Button, Input, Select, Stat, TabBar, Meter, EmptyState } from "@/components/ui/primitives";
import { DistributionBar, TrendPill } from "@/components/charts";
import { fmtUsd, fmtPct, cn } from "@/lib/utils";

type Tab = "rungs" | "positions" | "macro";

export function LadderView({
  report,
  symbols,
  prices,
  riskProfile,
  actions,
}: {
  report: LadderReport;
  symbols: string[];
  prices: Record<string, number>;
  riskProfile: string;
  actions: {
    addHolding: (fd: FormData) => void;
    removeHolding: (fd: FormData) => void;
    addRung: (fd: FormData) => void;
    removeRung: (fd: FormData) => void;
    setRungStatus: (fd: FormData) => void;
    setRiskProfile: (fd: FormData) => void;
    generateLadder: (fd: FormData) => void;
  };
}) {
  const [tab, setTab] = React.useState<Tab>("rungs");
  const [showAddHolding, setShowAddHolding] = React.useState(false);
  const [showAddRung, setShowAddRung] = React.useState(false);

  // Group by EFFECTIVE state: a rung price has crossed is awaiting a decision
  // regardless of what status was stored when it was created.
  const resolved = report.rungs.filter((r) => r.status === "executed" || r.status === "skipped");
  const pending = report.rungs.filter((r) => r.status === "armed" || r.status === "triggered");
  const triggered = pending.filter((r) => r.isHit);
  const armed = pending.filter((r) => !r.isHit);
  const profile = ALLOCATION_PROFILES[riskProfile as keyof typeof ALLOCATION_PROFILES] ?? ALLOCATION_PROFILES.balanced;

  return (
    <div className="space-y-4">
      {/* Macro override banner */}
      {report.macro.pivotDetected && (
        <Card glow="#ef4444">
          <div className="flex items-start gap-3 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-400">
              <Landmark size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-red-400">MACRO REGIME FLAG</span>
                <Badge tone="neg">{report.macro.label}</Badge>
              </div>
              <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-200">
                {report.macro.detail}
              </p>
              <p className="mt-1.5 text-[12px] font-medium text-amber-400">{report.macro.action}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stat strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Stat
            label="Portfolio value"
            value={fmtUsd(report.totalValue)}
            tone={report.totalPnl >= 0 ? "pos" : "neg"}
            sub={`${fmtUsd(report.totalPnl)} unrealised · ${fmtPct(report.totalPnlPct)}`}
          />
        </Card>
        <Card>
          <Stat
            label="Core allocation"
            value={`${report.coreAllocation.toFixed(1)}%`}
            accent={
              Math.abs(report.coreAllocation - report.targetCore) <= profile.band
                ? "#22c55e"
                : "#f59e0b"
            }
            sub={`Target ${report.targetCore}% ±${profile.band}pp · ${
              Math.abs(report.coreAllocation - report.targetCore) <= profile.band
                ? "in band"
                : "outside band"
            }`}
          />
        </Card>
        <Card>
          <Stat
            label="If all rungs fill"
            value={fmtUsd(report.realisedIfAllHit, { compact: true })}
            accent="#a855f7"
            sub={`${report.rungs.length} rungs defined · ${armed.length} armed`}
          />
        </Card>
        <Card>
          <Stat
            label="Discipline score"
            value={`${report.disciplineScore}%`}
            accent={report.disciplineScore >= 70 ? "#22c55e" : "#f59e0b"}
            sub={report.disciplineDetail}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_330px]">
        {/* Main */}
        <Card className="overflow-hidden">
          <TabBar<Tab>
            tabs={[
              { id: "rungs", label: "Exit rungs", count: report.rungs.length },
              { id: "positions", label: "Positions", count: report.positions.length },
              { id: "macro", label: "Macro override" },
            ]}
            value={tab}
            onChange={setTab}
            accent="#a855f7"
          />

          {tab === "rungs" && (
            <div className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setShowAddRung((v) => !v)}>
                  <Plus size={12} /> Add rung
                </Button>
                <form action={actions.generateLadder} className="flex items-center gap-1.5">
                  <Select name="symbol" className="h-8 text-[12px]" defaultValue="BTC">
                    {report.positions.map((p) => (
                      <option key={p.symbol} value={p.symbol}>{p.symbol}</option>
                    ))}
                  </Select>
                  <Button size="sm" variant="secondary" type="submit">
                    <Wand2 size={12} /> Auto-generate
                  </Button>
                </form>
                <span className="ml-auto text-[11px] text-ink-500">
                  Engine executes only rules you write
                </span>
              </div>

              {showAddRung && (
                <form
                  action={(fd) => {
                    actions.addRung(fd);
                    setShowAddRung(false);
                  }}
                  className="animate-fade-up mb-4 grid gap-2 rounded-xl border border-ink-700/60 bg-ink-850/50 p-3 sm:grid-cols-[100px_1fr_1fr_1.4fr_auto]"
                >
                  <Select name="symbol" required defaultValue={report.positions[0]?.symbol ?? "BTC"}>
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <Input name="triggerPrice" type="number" step="any" placeholder="Trigger price" required />
                  <Input name="sellPct" type="number" step="any" min={1} max={100} placeholder="Sell %" required />
                  <Input name="note" placeholder="Why this level?" />
                  <div className="flex gap-1">
                    <Button size="md" type="submit"><Check size={13} /></Button>
                    <Button size="md" variant="ghost" type="button" onClick={() => setShowAddRung(false)}>
                      <X size={13} />
                    </Button>
                  </div>
                </form>
              )}

              {report.rungs.length === 0 ? (
                <EmptyState
                  title="No exit rules defined"
                  body="A ladder is the rules you write when you are calm, executed at the moment you are not. Add a rung or auto-generate from cycle targets."
                />
              ) : (
                <div className="space-y-4">
                  {triggered.length > 0 && (
                    <RungGroup
                      title="Triggered — awaiting your decision"
                      tone="warn"
                      rungs={triggered}
                      actions={actions}
                      showDecision
                    />
                  )}
                  {armed.length > 0 && (
                    <RungGroup title="Armed" tone="neutral" rungs={armed} actions={actions} />
                  )}
                  {resolved.length > 0 && (
                    <RungGroup title="Resolved" tone="neutral" rungs={resolved} actions={actions} dim />
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "positions" && (
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Button size="sm" onClick={() => setShowAddHolding((v) => !v)}>
                  <Plus size={12} /> Add position
                </Button>
              </div>

              {showAddHolding && (
                <form
                  action={(fd) => {
                    actions.addHolding(fd);
                    setShowAddHolding(false);
                  }}
                  className="animate-fade-up mb-4 grid gap-2 rounded-xl border border-ink-700/60 bg-ink-850/50 p-3 sm:grid-cols-[110px_1fr_1fr_auto]"
                >
                  <Select name="symbol" required defaultValue="BTC">
                    {symbols.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </Select>
                  <Input name="quantity" type="number" step="any" placeholder="Quantity" required />
                  <Input name="costBasis" type="number" step="any" placeholder="Cost basis (optional)" />
                  <div className="flex gap-1">
                    <Button size="md" type="submit"><Check size={13} /></Button>
                    <Button size="md" variant="ghost" type="button" onClick={() => setShowAddHolding(false)}>
                      <X size={13} />
                    </Button>
                  </div>
                </form>
              )}

              {report.positions.length === 0 ? (
                <EmptyState
                  title="No positions"
                  body="Add your holdings to activate drift bands, P&L and rung sizing. Nothing is ever sent to an exchange."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-ink-700/50 text-[10px] uppercase tracking-[0.09em] text-ink-500">
                        <th className="px-2 py-2 text-left font-medium">Asset</th>
                        <th className="px-2 py-2 text-right font-medium">Qty</th>
                        <th className="px-2 py-2 text-right font-medium">Basis</th>
                        <th className="px-2 py-2 text-right font-medium">Price</th>
                        <th className="px-2 py-2 text-right font-medium">Value</th>
                        <th className="px-2 py-2 text-right font-medium">P&L</th>
                        <th className="px-2 py-2 text-right font-medium">Alloc / target</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {report.positions.map((p) => (
                        <tr key={p.symbol} className="border-b border-ink-800/60">
                          <td className="px-2 py-2.5">
                            <div className="text-[13px] font-semibold text-ink-50">{p.symbol}</div>
                            <div className="text-[10.5px] text-ink-500">{p.name}</div>
                          </td>
                          <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-200">
                            {p.quantity < 1 ? p.quantity.toFixed(4) : p.quantity.toLocaleString()}
                          </td>
                          <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-400">
                            {fmtUsd(p.costBasis, { dp: p.costBasis < 10 ? 2 : 0 })}
                          </td>
                          <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-100">
                            {fmtUsd(p.price, { dp: p.price < 10 ? 2 : 0 })}
                          </td>
                          <td className="mono px-2 py-2.5 text-right text-[12px] text-ink-50">
                            {fmtUsd(p.value)}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <div className={cn("mono text-[12px]", p.pnl >= 0 ? "text-green-400" : "text-red-400")}>
                              {fmtUsd(p.pnl)}
                            </div>
                            <TrendPill value={p.pnlPct} />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              <Meter
                                value={p.allocation}
                                max={Math.max(p.allocation, p.targetAllocation) * 1.2}
                                color={
                                  p.driftState === "ok" ? "#22c55e" : p.driftState === "over" ? "#f59e0b" : "#38bdf8"
                                }
                                className="w-12"
                                height={4}
                              />
                              <span className="mono text-[11.5px] text-ink-200">
                                {p.allocation.toFixed(0)}%
                              </span>
                              <span className="mono text-[10.5px] text-ink-500">
                                /{p.targetAllocation.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <form action={actions.removeHolding}>
                              <input type="hidden" name="id" value={p.symbol} />
                              <button
                                type="submit"
                                title={`Remove ${p.symbol}`}
                                className="grid h-6 w-6 place-items-center rounded text-ink-600 transition-colors hover:text-red-400"
                              >
                                <Trash2 size={12} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "macro" && (
            <div className="space-y-4 p-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-ink-700/60 p-3.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Effective fed funds</div>
                  <div className="mono mt-1 text-xl font-semibold text-ink-50">
                    {report.macro.fedFunds.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg border border-ink-700/60 p-3.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">12m implied path</div>
                  <div
                    className="mono mt-1 text-xl font-semibold"
                    style={{ color: report.macro.pivotDetected ? "#ef4444" : "#22c55e" }}
                  >
                    {report.macro.impliedPath12m.toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-lg border border-ink-700/60 p-3.5">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Regime</div>
                  <div
                    className="mt-1 text-[15px] font-semibold"
                    style={{
                      color:
                        report.macro.state === "tightening"
                          ? "#ef4444"
                          : report.macro.state === "easing"
                            ? "#22c55e"
                            : "#8290ad",
                    }}
                  >
                    {report.macro.label}
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] leading-relaxed text-ink-300">{report.macro.detail}</p>

              <div className="rounded-lg border border-ink-700/60 bg-ink-850/40 p-4">
                <div className="flex items-center gap-2">
                  <Target size={13} className="text-brand-400" />
                  <span className="text-[12px] font-semibold text-ink-100">Why this is the override</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
                  The four-year halving cycle appears degraded — rates and the business cycle now
                  dominate as drivers because of institutional participation. That makes a Fed pivot
                  from cutting to hiking the single cleanest exit marker available: historically the
                  following ~12 months underperform. When the implied path flips up, this module
                  raises the flag and surfaces the defensive action you pre-committed to — it does
                  not act on your behalf.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* Side */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Allocation" accent="#a855f7" />
            <div className="px-5 pb-5">
              <DistributionBar
                segments={[
                  { label: "Core", value: report.coreAllocation, color: "#f7931a" },
                  { label: "Satellite", value: report.satelliteAllocation, color: "#a855f7" },
                ]}
                height={10}
              />
              <div className="mt-4">
                <form action={actions.setRiskProfile} className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-ink-500">
                    Risk profile
                  </label>
                  <div className="flex gap-1.5">
                    <Select name="riskProfile" defaultValue={riskProfile} className="flex-1">
                      <option value="conservative">Conservative — 80% core</option>
                      <option value="balanced">Balanced — 72% core</option>
                      <option value="aggressive">Aggressive — 55% core</option>
                    </Select>
                    <Button size="md" variant="secondary" type="submit">Set</Button>
                  </div>
                </form>
              </div>
              {report.coreAllocation < 50 && report.totalValue > 0 && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/[0.07] px-3 py-2.5">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0 text-red-400" />
                  <span className="text-[11.5px] leading-relaxed text-red-300">
                    Core floor breached — below the 50% hard floor.
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Rebalance actions" subtitle="Concrete sizing" accent="#38bdf8" />
            <div className="px-5 pb-5">
              {report.rebalanceActions.length ? (
                <ul className="space-y-2.5">
                  {report.rebalanceActions.map((a, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-ink-700/60 bg-ink-850/40 px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-300"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-[12px] text-green-400">
                  Every position is inside its drift band. No action required.
                </p>
              )}
            </div>
          </Card>

          {report.nextRung && (
            <Card glow="#a855f7">
              <CardHeader title="Next rung" accent="#a855f7" />
              <div className="px-5 pb-5">
                <div className="flex items-baseline gap-2">
                  <Badge tone="neutral">{report.nextRung.symbol}</Badge>
                  <span className="mono text-xl font-semibold text-ink-50">
                    {fmtUsd(report.nextRung.triggerPrice, {
                      dp: report.nextRung.triggerPrice < 10 ? 2 : 0,
                    })}
                  </span>
                </div>
                <div className="mono mt-2 text-[12px] text-ink-400">
                  +{report.nextRung.distancePct.toFixed(1)}% away · sell {report.nextRung.sellPct}% ·{" "}
                  {fmtUsd(report.nextRung.proceedsUsd, { compact: true })} proceeds
                </div>
                {report.nextRung.note && (
                  <p className="mt-2 text-[11.5px] text-ink-500">{report.nextRung.note}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RungGroup({
  title, rungs, actions, showDecision, dim, tone,
}: {
  title: string;
  tone: "warn" | "neutral";
  rungs: LadderReport["rungs"];
  actions: { removeRung: (fd: FormData) => void; setRungStatus: (fd: FormData) => void };
  showDecision?: boolean;
  dim?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
          {title}
        </span>
        <Badge tone={tone === "warn" ? "warn" : "neutral"}>{rungs.length}</Badge>
      </div>
      <div className="space-y-2">
        {rungs.map((r) => (
          <div
            key={r.id}
            className={cn(
              "rounded-xl border p-3.5 transition-colors",
              showDecision
                ? "border-amber-500/30 bg-amber-500/[0.05]"
                : "border-ink-700/60 bg-ink-850/30",
              dim && "opacity-60"
            )}
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="neutral">{r.symbol}</Badge>
              <span className="mono text-[14px] font-semibold text-ink-50">
                {fmtUsd(r.triggerPrice, { dp: r.triggerPrice < 10 ? 2 : 0 })}
              </span>
              <span className="mono text-[12px] text-purple-400">−{r.sellPct}%</span>
              {!r.isHit && (
                <span className="mono text-[11.5px] text-ink-400">
                  +{r.distancePct.toFixed(1)}% away
                </span>
              )}
              {r.isHit && r.status === "triggered" && (
                <Badge tone="warn" dot>Hit — decide</Badge>
              )}
              {r.status === "executed" && <Badge tone="pos">Executed</Badge>}
              {r.status === "skipped" && <Badge tone="neg">Skipped</Badge>}
              <span className="mono ml-auto text-[11.5px] text-ink-400">
                {fmtUsd(r.proceedsUsd, { compact: true })}
              </span>
              <form action={actions.removeRung}>
                <input type="hidden" name="id" value={r.id} />
                <button
                  type="submit"
                  className="grid h-6 w-6 place-items-center rounded text-ink-600 transition-colors hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </form>
            </div>

            {r.note && <p className="mt-1.5 text-[11.5px] text-ink-500">{r.note}</p>}

            {showDecision && (
              <div className="mt-3 flex gap-2 border-t border-amber-500/15 pt-3">
                <form action={actions.setRungStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="executed" />
                  <Button size="sm" type="submit">
                    <Check size={12} /> I took it
                  </Button>
                </form>
                <form action={actions.setRungStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value="skipped" />
                  <Button size="sm" variant="ghost" type="submit">
                    <X size={12} /> I skipped it
                  </Button>
                </form>
                <span className="ml-auto self-center text-[11px] text-ink-500">
                  Both answers count toward your discipline score
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

