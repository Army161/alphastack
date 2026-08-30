"use client";

import * as React from "react";
import { ArrowUpDown, Check, GitCompare, Search, X, AlertTriangle, Download } from "lucide-react";
import type { ScreenRow } from "@/lib/modules/terminal";
import { THESIS_CRITERIA } from "@/lib/modules/terminal";
import { Card, CardHeader, Badge, Button, Input, Select, Stat, Meter } from "@/components/ui/primitives";
import { PriceChart, TrendPill, HBarChart } from "@/components/charts";
import { fmtUsd, fmtPct, cn } from "@/lib/utils";

type SortKey = "thesisFit" | "marketCap" | "change24h" | "upside2030" | "volatility30d" | "aiExposure";

export function TerminalView({
  rows,
  overview,
  series,
}: {
  rows: ScreenRow[];
  overview: {
    totalMarketCap: number;
    btcDominance: number;
    breadth: number;
    qualifiers: number;
    avgDrawdown: number;
    advancers: number;
    decliners: number;
    dataSource?: string;
    sentiment?: { value: number; classification: string } | null;
  };
  series: Record<string, { t: string; c: number }[]>;
}) {
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("thesisFit");
  const [minFit, setMinFit] = React.useState(0);
  const [tier, setTier] = React.useState("all");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [detail, setDetail] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    return rows
      .filter((r) => (tier === "all" ? true : r.tier === tier))
      .filter((r) => r.thesisFit >= minFit)
      .filter(
        (r) =>
          !q ||
          r.symbol.toLowerCase().includes(q.toLowerCase()) ||
          r.name.toLowerCase().includes(q.toLowerCase()) ||
          r.category.toLowerCase().includes(q.toLowerCase())
      )
      .sort((a, b) => (b[sort] as number) - (a[sort] as number));
  }, [rows, q, sort, minFit, tier]);

  const detailRow = detail ? rows.find((r) => r.symbol === detail) : null;
  const compareRows = rows.filter((r) => selected.includes(r.symbol));

  function toggle(symbol: string) {
    setSelected((s) =>
      s.includes(symbol) ? s.filter((x) => x !== symbol) : s.length >= 4 ? s : [...s, symbol]
    );
  }

  function exportCsv() {
    const header = ["symbol", "name", "price", "thesisFit", "grade", "change24h", "marketCap", "target2030", "volatility30d", "aiExposure"];
    const body = filtered.map((r) =>
      [r.symbol, r.name, r.price, r.thesisFit, r.thesisGrade, r.change24h.toFixed(2), r.marketCap, r.target2030, r.volatility30d, r.aiExposure].join(",")
    );
    const blob = new Blob([[header.join(","), ...body].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "alphastack-screen.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Overview strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><Stat label="Total market cap" value={fmtUsd(overview.totalMarketCap, { compact: true })} sub={`${overview.advancers} up / ${overview.decliners} down · ${overview.dataSource === "live" ? "live prices" : "modelled"}`} /></Card>
        <Card><Stat label="BTC dominance" value={`${overview.btcDominance}%`} accent="#f7931a" sub="Share of tracked universe" /></Card>
        <Card><Stat label="Pass thesis filter" value={`${overview.qualifiers}/${rows.length}`} accent="#22c55e" sub="Fit ≥ 70 on five weighted criteria" /></Card>
        <Card><Stat label="Avg drawdown" value={`${overview.avgDrawdown}%`} tone="neg" sub="From all-time highs across the universe" /></Card>
      </div>

      {/* Controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-3.5">
          <div className="relative min-w-[180px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search symbol, name or category…"
              className="pl-9"
            />
          </div>
          <Select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="all">All tiers</option>
            <option value="core">Core</option>
            <option value="major">Major</option>
            <option value="outlier">Outlier</option>
            <option value="watch">Watch</option>
          </Select>
          <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="thesisFit">Sort: thesis fit</option>
            <option value="marketCap">Sort: market cap</option>
            <option value="change24h">Sort: 24h change</option>
            <option value="upside2030">Sort: 2030 upside</option>
            <option value="volatility30d">Sort: volatility</option>
            <option value="aiExposure">Sort: AI exposure</option>
          </Select>
          <div className="flex items-center gap-2 rounded-lg border border-ink-700/60 px-3 py-1.5">
            <span className="text-[11.5px] text-ink-400">Min fit</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minFit}
              onChange={(e) => setMinFit(Number(e.target.value))}
              className="w-20 accent-teal-400"
            />
            <span className="mono w-7 text-[11.5px] text-ink-100">{minFit}</span>
          </div>
          <Button size="md" variant="ghost" onClick={exportCsv}>
            <Download size={13} /> CSV
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border-t border-ink-700/50">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-ink-700/50">
                <th className="w-9 px-3 py-2.5" />
                <Th>Asset</Th>
                <Th align="right">Price</Th>
                <Th align="right">24h</Th>
                <Th align="right">30d</Th>
                <Th align="right">Market cap</Th>
                <Th align="right">
                  <span className="inline-flex items-center gap-1">
                    Thesis fit <ArrowUpDown size={9} />
                  </span>
                </Th>
                <Th align="right">2030 target</Th>
                <Th align="right">Vol</Th>
                <Th align="right">AI</Th>
                <Th align="right">Flags</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const isSel = selected.includes(r.symbol);
                return (
                  <tr
                    key={r.symbol}
                    onClick={() => setDetail(r.symbol)}
                    className={cn(
                      "cursor-pointer border-b border-ink-800/60 transition-colors hover:bg-ink-850/50",
                      isSel && "bg-brand-500/[0.05]"
                    )}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggle(r.symbol); }}>
                      <div
                        className={cn(
                          "grid h-4 w-4 place-items-center rounded border transition-colors",
                          isSel ? "border-brand-500 bg-brand-500" : "border-ink-600 hover:border-ink-500"
                        )}
                      >
                        {isSel && <Check size={10} className="text-ink-950" />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] font-semibold text-ink-50">{r.symbol}</span>
                            <span className="truncate text-[11.5px] text-ink-500">{r.name}</span>
                          </div>
                          <div className="text-[10.5px] text-ink-600">{r.category}</div>
                        </div>
                      </div>
                    </td>
                    <Td>{fmtUsd(r.price, { dp: r.price < 10 ? 3 : 0 })}</Td>
                    <Td><TrendPill value={r.change24h} /></Td>
                    <Td><TrendPill value={r.change30d} /></Td>
                    <Td dim>{fmtUsd(r.marketCap, { compact: true })}</Td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        <Meter
                          value={r.thesisFit}
                          color={r.thesisFit >= 90 ? "#22c55e" : r.thesisFit >= 70 ? "#2dd4bf" : r.thesisFit >= 45 ? "#eab308" : "#ef4444"}
                          className="w-14"
                          height={4}
                        />
                        <span className="mono w-6 text-right text-[12px] text-ink-100">{r.thesisFit}</span>
                        <Badge tone={r.thesisFit >= 70 ? "pos" : r.thesisFit >= 45 ? "warn" : "neg"}>
                          {r.thesisGrade}
                        </Badge>
                      </div>
                    </td>
                    <Td>
                      <span className="text-green-400">
                        {fmtUsd(r.target2030, { dp: r.target2030 < 10 ? 2 : 0 })}
                      </span>
                      <span className="ml-1.5 text-[10.5px] text-ink-500">
                        {(r.target2030 / r.price).toFixed(1)}x
                      </span>
                    </Td>
                    <Td dim>{r.volatility30d}%</Td>
                    <Td dim>{r.aiExposure}</Td>
                    <td className="px-3 py-2.5 text-right">
                      {r.riskFlags.length ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/12 px-1.5 py-0.5 text-[11px] text-amber-400">
                          <AlertTriangle size={9} /> {r.riskFlags.length}
                        </span>
                      ) : (
                        <span className="text-[11px] text-green-400">clean</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filtered.length && (
            <div className="py-10 text-center text-[12.5px] text-ink-500">
              No assets match those filters.
            </div>
          )}
        </div>
      </Card>

      {/* Comparison tray */}
      {compareRows.length >= 2 && (
        <Card glow="#38bdf8">
          <CardHeader
            title="Comparison"
            subtitle={`${compareRows.length} assets side by side`}
            accent="#38bdf8"
            action={
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                <X size={12} /> Clear
              </Button>
            }
          />
          <div className="overflow-x-auto px-5 pb-5">
            <table className="w-full min-w-[560px] text-[12.5px]">
              <thead>
                <tr className="border-b border-ink-700/50 text-[10.5px] uppercase tracking-wider text-ink-500">
                  <th className="py-2 text-left font-medium">Metric</th>
                  {compareRows.map((r) => (
                    <th key={r.symbol} className="py-2 text-right font-semibold text-ink-100">
                      {r.symbol}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="mono">
                <CmpRow label="Thesis fit" rows={compareRows} get={(r) => `${r.thesisFit} (${r.thesisGrade})`} best={(r) => r.thesisFit} />
                <CmpRow label="Price" rows={compareRows} get={(r) => fmtUsd(r.price, { dp: r.price < 10 ? 3 : 0 })} />
                <CmpRow label="Market cap" rows={compareRows} get={(r) => fmtUsd(r.marketCap, { compact: true })} />
                <CmpRow label="2030 upside" rows={compareRows} get={(r) => `${Math.round(r.upside2030)}%`} best={(r) => r.upside2030} />
                <CmpRow label="Volatility" rows={compareRows} get={(r) => `${r.volatility30d}%`} best={(r) => -r.volatility30d} />
                <CmpRow label="AI exposure" rows={compareRows} get={(r) => String(r.aiExposure)} />
                <CmpRow label="Drawdown from ATH" rows={compareRows} get={(r) => `${Math.round(r.drawdownFromAth)}%`} best={(r) => r.drawdownFromAth} />
                <CmpRow label="Risk flags" rows={compareRows} get={(r) => String(r.riskFlags.length)} best={(r) => -r.riskFlags.length} />
              </tbody>
            </table>
            <div className="mt-4">
              <HBarChart
                data={compareRows.map((r) => ({
                  name: r.symbol,
                  value: r.thesisFit,
                  color: r.thesisFit >= 90 ? "#22c55e" : r.thesisFit >= 70 ? "#2dd4bf" : "#eab308",
                }))}
                height={compareRows.length * 34 + 40}
                domain={[0, 100]}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Detail drawer */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex justify-end bg-ink-950/60 backdrop-blur-sm" onClick={() => setDetail(null)}>
          <div
            className="h-full w-full max-w-lg overflow-y-auto border-l border-ink-700/60 bg-ink-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center gap-3 border-b border-ink-700/50 bg-ink-900/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-ink-50">{detailRow.symbol}</h2>
                  <Badge tone={detailRow.thesisFit >= 70 ? "pos" : "warn"}>
                    Grade {detailRow.thesisGrade}
                  </Badge>
                </div>
                <p className="text-[12px] text-ink-400">{detailRow.name} · {detailRow.category}</p>
              </div>
              <button onClick={() => setDetail(null)} className="ml-auto text-ink-500 hover:text-ink-100">
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-ink-700/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Price</div>
                  <div className="mono mt-1 text-lg font-semibold text-ink-50">
                    {fmtUsd(detailRow.price, { dp: detailRow.price < 10 ? 3 : 0 })}
                  </div>
                  <div className="mt-1"><TrendPill value={detailRow.change24h} /></div>
                </div>
                <div className="rounded-lg border border-ink-700/60 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">2030 target</div>
                  <div className="mono mt-1 text-lg font-semibold text-green-400">
                    {fmtUsd(detailRow.target2030, { dp: detailRow.target2030 < 10 ? 2 : 0 })}
                  </div>
                  <div className="mt-1 text-[11px] text-ink-400">
                    {(detailRow.target2030 / detailRow.price).toFixed(1)}x · {fmtPct(detailRow.upside2030, 0)}
                  </div>
                </div>
              </div>

              {series[detailRow.symbol] && (
                <div className="rounded-lg border border-ink-700/60 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-wider text-ink-500">
                    365-day price
                  </div>
                  <PriceChart data={series[detailRow.symbol]} color="#38bdf8" height={160} />
                </div>
              )}

              <div>
                <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider text-ink-300">
                  Thesis criteria
                </h3>
                <div className="space-y-2">
                  {detailRow.criteria.map((c) => {
                    const meta = THESIS_CRITERIA.find((t) => t.key === c.key);
                    return (
                      <div
                        key={c.key}
                        className="rounded-lg border border-ink-700/60 bg-ink-850/40 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "grid h-4 w-4 place-items-center rounded-full",
                              c.pass ? "bg-green-500/20 text-green-400" : "bg-red-500/15 text-red-400"
                            )}
                          >
                            {c.pass ? <Check size={9} /> : <X size={9} />}
                          </span>
                          <span className="text-[12.5px] font-medium text-ink-100">{c.label}</span>
                          <span className="mono ml-auto text-[11px] text-ink-500">w{c.weight}</span>
                        </div>
                        {meta && (
                          <p className="mt-1.5 pl-6 text-[11.5px] leading-relaxed text-ink-400">
                            {meta.why}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {detailRow.riskFlags.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-300">
                    Risk flags
                  </h3>
                  <div className="space-y-1.5">
                    {detailRow.riskFlags.map((f) => (
                      <div
                        key={f}
                        className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2"
                      >
                        <AlertTriangle size={12} className="mt-0.5 shrink-0 text-amber-400" />
                        <span className="text-[12px] text-ink-200">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-ink-700/60 bg-ink-850/40 p-4">
                <h3 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-ink-300">
                  Verdict
                </h3>
                <p className="text-[12.5px] leading-relaxed text-ink-200">{detailRow.verdict}</p>
              </div>

              <Button
                className="w-full"
                variant="secondary"
                onClick={() => {
                  toggle(detailRow.symbol);
                  setDetail(null);
                }}
              >
                <GitCompare size={13} />
                {selected.includes(detailRow.symbol) ? "Remove from comparison" : "Add to comparison"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[10px] font-medium uppercase tracking-[0.09em] text-ink-500",
        align === "right" ? "text-right" : "text-left"
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, dim }: { children: React.ReactNode; dim?: boolean }) {
  return (
    <td className={cn("mono px-3 py-2.5 text-right text-[12px]", dim ? "text-ink-400" : "text-ink-100")}>
      {children}
    </td>
  );
}

function CmpRow({
  label, rows, get, best,
}: {
  label: string;
  rows: ScreenRow[];
  get: (r: ScreenRow) => string;
  best?: (r: ScreenRow) => number;
}) {
  const bestSymbol = best
    ? [...rows].sort((a, b) => best(b) - best(a))[0]?.symbol
    : null;
  return (
    <tr className="border-b border-ink-800/60">
      <td className="py-2 text-left font-sans text-ink-400">{label}</td>
      {rows.map((r) => (
        <td
          key={r.symbol}
          className={cn(
            "py-2 text-right",
            r.symbol === bestSymbol ? "font-semibold text-green-400" : "text-ink-200"
          )}
        >
          {get(r)}
        </td>
      ))}
    </tr>
  );
}
