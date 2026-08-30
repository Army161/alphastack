"use client";

import * as React from "react";
import { Bell, CalendarDays, Eye, Landmark, TrendingDown, TrendingUp } from "lucide-react";
import type { CatalystReport, CatalystEvent } from "@/lib/modules/catalyst";
import { CATEGORY_COLORS, IMPACT_WEIGHT } from "@/lib/modules/catalyst";
import { Card, CardHeader, Badge, Button, Select, Stat, Meter } from "@/components/ui/primitives";
import { DistributionBar } from "@/components/charts";
import { DataSource } from "@/components/ui/DataSource";
import { cn } from "@/lib/utils";

export function CatalystView({ report }: { report: CatalystReport }) {
  const [category, setCategory] = React.useState("all");
  const [impact, setImpact] = React.useState("all");
  const [watched, setWatched] = React.useState<Record<string, boolean>>({});

  const events = report.events
    .filter((e) => category === "all" || e.category === category)
    .filter((e) => impact === "all" || e.impact === impact);

  const skewColor = report.netSkew > 20 ? "#22c55e" : report.netSkew < -20 ? "#ef4444" : "#eab308";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Stat
            label="Net catalyst skew"
            value={`${report.netSkew > 0 ? "+" : ""}${report.netSkew}`}
            accent={skewColor}
            sub={`${report.skewLabel} · impact- and decay-weighted over 120 days`}
          />
        </Card>
        <Card>
          <Stat
            label="Next event"
            value={report.next ? `${report.next.daysAway}d` : "—"}
            accent="#14b8a6"
            sub={report.next?.title ?? "Nothing scheduled"}
          />
        </Card>
        <Card>
          <Stat label="In next 30 days" value={report.window30d} sub="Dated events on the book" />
        </Card>
        <Card>
          <Stat
            label="Macro regime"
            value={report.macro.state === "tightening" ? "TIGHTENING" : report.macro.state === "easing" ? "EASING" : "NEUTRAL"}
            accent={report.macro.state === "tightening" ? "#ef4444" : report.macro.state === "easing" ? "#22c55e" : "#8290ad"}
            sub={`Funds ${report.macro.fedFunds}% · 12m path ${report.macro.impliedPath12m}%`}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-hidden">
          <CardHeader
            title="Forward book"
            subtitle="Dated, binary events that actually drive the next leg"
            accent="#14b8a6"
            action={
              <div className="flex gap-1.5">
                <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 text-[11.5px]">
                  <option value="all">All categories</option>
                  <option value="regulatory">Regulatory</option>
                  <option value="monetary">Monetary</option>
                  <option value="political">Political</option>
                  <option value="structural">Structural</option>
                  <option value="macro">Macro</option>
                  <option value="protocol">Protocol</option>
                </Select>
                <Select value={impact} onChange={(e) => setImpact(e.target.value)} className="h-8 text-[11.5px]">
                  <option value="all">All impact</option>
                  <option value="extreme">Extreme</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </Select>
              </div>
            }
          />

          <div className="px-5 pb-5">
            <div className="relative">
              <div className="absolute bottom-2 left-[52px] top-2 w-px bg-ink-700/60" />
              <div className="space-y-3">
                {events.map((e) => (
                  <EventRow
                    key={e.id}
                    e={e}
                    watched={!!watched[e.id]}
                    onWatch={() => setWatched((w) => ({ ...w, [e.id]: !w[e.id] }))}
                  />
                ))}
              </div>
            </div>
            {!events.length && (
              <p className="py-8 text-center text-[12.5px] text-ink-500">
                No events match those filters.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card glow={skewColor}>
            <CardHeader title="Skew composition" accent={skewColor} />
            <div className="px-5 pb-5">
              <DistributionBar
                segments={[
                  { label: "Bullish weight", value: report.bullishWeight, color: "#22c55e" },
                  { label: "Bearish weight", value: report.bearishWeight, color: "#ef4444" },
                ]}
                height={10}
              />
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
                Each event contributes its impact weight, decayed by how far out it sits.
                Two-sided events split evenly across both books — they raise volatility
                expectation without adding direction.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Macro monitor" accent="#f59e0b" />
            <div className="px-5 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <Landmark size={14} className="text-amber-400" />
                <span className="text-[13px] font-medium text-ink-100">{report.macro.label}</span>
                <DataSource prov={report.macro.prov} className="ml-auto" />
              </div>
              {report.macro.curve2s10s !== null && (
                <div className="mono mt-2 text-[11px] text-ink-500">
                  2s10s curve {report.macro.curve2s10s > 0 ? "+" : ""}{report.macro.curve2s10s.toFixed(2)}%
                  {report.macro.asOf ? ` · as of ${report.macro.asOf}` : ""}
                </div>
              )}
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-400">
                {report.macro.detail}
              </p>
              <div className="mt-3 rounded-lg border border-ink-700/60 bg-ink-850/40 px-3 py-2.5">
                <span className="text-[11.5px] font-medium text-amber-400">
                  {report.macro.action}
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Briefing" accent="#14b8a6" />
            <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-200">
              {report.briefing}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function EventRow({
  e, watched, onWatch,
}: {
  e: CatalystEvent & { daysAway: number };
  watched: boolean;
  onWatch: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const color = CATEGORY_COLORS[e.category];
  const past = e.daysAway < 0;

  return (
    <div className={cn("relative flex gap-3", past && "opacity-50")}>
      <div className="w-[44px] shrink-0 pt-1 text-right">
        <div className="mono text-[13px] font-semibold text-ink-100">
          {past ? `${Math.abs(e.daysAway)}d` : `${e.daysAway}d`}
        </div>
        <div className="text-[9.5px] uppercase tracking-wider text-ink-500">
          {past ? "ago" : "out"}
        </div>
      </div>

      <div className="relative z-10 mt-2 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-ink-900" style={{ background: color }} />

      <div className="min-w-0 flex-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full rounded-xl border border-ink-700/60 bg-ink-850/30 p-3.5 text-left transition-colors hover:border-ink-600"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink-50">{e.title}</span>
            <Badge tone={e.impact === "extreme" ? "neg" : e.impact === "high" ? "warn" : "neutral"}>
              {e.impact}
            </Badge>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                e.direction === "bullish" ? "text-green-400" : e.direction === "bearish" ? "text-red-400" : "text-ink-400"
              )}
            >
              {e.direction === "bullish" ? <TrendingUp size={11} /> : e.direction === "bearish" ? <TrendingDown size={11} /> : <CalendarDays size={11} />}
              {e.direction}
            </span>
            <span className="mono ml-auto text-[10.5px] text-ink-500">{e.date}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span
              className="rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
              style={{ background: `${color}1a`, color }}
            >
              {e.category}
            </span>
            <Meter
              value={IMPACT_WEIGHT[e.impact]}
              max={7}
              color={color}
              className="w-16"
              height={3}
            />
            <span className="text-[10.5px] text-ink-500">{e.status}</span>
          </div>

          {open && (
            <div className="animate-fade-up mt-3 space-y-2.5 border-t border-ink-700/50 pt-3">
              <p className="text-[12px] leading-relaxed text-ink-300">{e.detail}</p>
              <div className="flex items-start gap-2 rounded-lg bg-ink-900/60 px-3 py-2">
                <Eye size={11} className="mt-0.5 shrink-0 text-brand-400" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Watch for</div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-300">{e.watchFor}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="mono text-[10.5px] text-ink-600">Source: {e.source}</span>
                <button
                  onClick={(ev) => { ev.stopPropagation(); onWatch(); }}
                  className={cn(
                    "ml-auto flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    watched
                      ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                      : "border-ink-700/60 text-ink-400 hover:text-ink-200"
                  )}
                >
                  <Bell size={10} /> {watched ? "Watching" : "Watch"}
                </button>
              </div>
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
