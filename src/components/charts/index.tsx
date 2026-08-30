"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn, fmtUsd } from "@/lib/utils";

const AXIS = { stroke: "#5a6785", fontSize: 10, fontFamily: "var(--font-mono)" };

function TipShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-ink-600/70 bg-ink-950/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
      {children}
    </div>
  );
}

/* ------------------------------------------------------------ Sparkline */

export function Sparkline({
  data,
  color = "#2dd4bf",
  height = 34,
  strokeWidth = 1.5,
}: {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
}) {
  const id = React.useId().replace(/:/g, "");
  const rows = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={rows} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={`url(#sp-${id})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ----------------------------------------------------------- PriceChart */

export function PriceChart({
  data,
  color = "#2dd4bf",
  height = 260,
  refLines = [],
  valueKey = "c",
  labelKey = "t",
  currency = true,
}: {
  data: Record<string, number | string>[];
  color?: string;
  height?: number;
  refLines?: { y: number; label: string; color?: string }[];
  valueKey?: string;
  labelKey?: string;
  currency?: boolean;
}) {
  const id = React.useId().replace(/:/g, "");
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`pc-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(90,103,133,0.13)" vertical={false} />
        <XAxis
          dataKey={labelKey}
          {...AXIS}
          tickLine={false}
          axisLine={false}
          minTickGap={44}
          tickFormatter={(v: string) => String(v).slice(5)}
        />
        <YAxis
          {...AXIS}
          tickLine={false}
          axisLine={false}
          width={54}
          domain={["auto", "auto"]}
          tickFormatter={(v: number) => (currency ? fmtUsd(v, { compact: true }) : String(Math.round(v)))}
        />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipShell>
                <div className="text-ink-400">{label}</div>
                <div className="mono mt-0.5 text-sm font-semibold" style={{ color }}>
                  {currency
                    ? fmtUsd(Number(payload[0].value), { dp: Number(payload[0].value) < 10 ? 3 : 0 })
                    : Number(payload[0].value).toFixed(1)}
                </div>
              </TipShell>
            ) : null
          }
        />
        {refLines.map((r) => (
          <ReferenceLine
            key={r.label}
            y={r.y}
            stroke={r.color ?? "#5a6785"}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: r.label,
              position: "insideTopRight",
              fill: r.color ?? "#8290ad",
              fontSize: 9.5,
              fontFamily: "var(--font-mono)",
            }}
          />
        ))}
        <Area
          type="monotone"
          dataKey={valueKey}
          stroke={color}
          strokeWidth={1.8}
          fill={`url(#pc-${id})`}
          isAnimationActive={false}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------ DualAxis */

export function DualAxisChart({
  data,
  height = 250,
  barKey,
  lineKey,
  barColor = "#3a4763",
  lineColor = "#2dd4bf",
  barLabel,
  lineLabel,
}: {
  data: Record<string, number | string>[];
  height?: number;
  barKey: string;
  lineKey: string;
  barColor?: string;
  lineColor?: string;
  barLabel: string;
  lineLabel: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="rgba(90,103,133,0.13)" vertical={false} />
        <XAxis
          dataKey="t"
          {...AXIS}
          tickLine={false}
          axisLine={false}
          minTickGap={44}
          tickFormatter={(v: string) => String(v).slice(5)}
        />
        <YAxis yAxisId="l" {...AXIS} tickLine={false} axisLine={false} width={50}
          tickFormatter={(v: number) => fmtUsd(v, { compact: true })} />
        <YAxis yAxisId="r" orientation="right" {...AXIS} tickLine={false} axisLine={false} width={38} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TipShell>
                <div className="text-ink-400">{label}</div>
                {payload.map((p) => (
                  <div key={String(p.dataKey)} className="mono mt-0.5 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                    <span className="text-ink-300">
                      {p.dataKey === barKey ? barLabel : lineLabel}
                    </span>
                    <span className="ml-auto font-semibold text-ink-50">
                      {p.dataKey === barKey
                        ? fmtUsd(Number(p.value), { compact: true })
                        : Number(p.value).toFixed(1)}
                    </span>
                  </div>
                ))}
              </TipShell>
            ) : null
          }
        />
        <Bar yAxisId="l" dataKey={barKey} fill={barColor} isAnimationActive={false} radius={[2, 2, 0, 0]} />
        <Line
          yAxisId="r"
          type="monotone"
          dataKey={lineKey}
          stroke={lineColor}
          strokeWidth={1.9}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------------------------------------- Gauge */

export function ScoreGauge({
  value,
  max = 100,
  color = "#2dd4bf",
  size = 168,
  label,
  sublabel,
  thickness = 11,
}: {
  value: number;
  max?: number;
  color?: string;
  size?: number;
  label?: string;
  sublabel?: string;
  thickness?: number;
}) {
  const r = (size - thickness) / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  // 270-degree arc starting at 135deg
  const startA = 135;
  const sweep = 270;
  const pct = Math.max(0, Math.min(1, value / max));
  const circumference = (sweep / 360) * 2 * Math.PI * r;

  const polar = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const p0 = polar(startA);
  const p1 = polar(startA + sweep);
  const arc = `M ${p0.x} ${p0.y} A ${r} ${r} 0 1 1 ${p1.x} ${p1.y}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        <path
          d={arc}
          fill="none"
          stroke="rgba(90,103,133,0.18)"
          strokeWidth={thickness}
          strokeLinecap="round"
        />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference * 2}`}
          style={{ transition: "stroke-dasharray 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const a = startA + sweep * f;
          const outer = polar(a);
          const rad = ((a - 90) * Math.PI) / 180;
          const ix = cx + (r - thickness / 2 - 5) * Math.cos(rad);
          const iy = cy + (r - thickness / 2 - 5) * Math.sin(rad);
          return (
            <line
              key={f}
              x1={ix}
              y1={iy}
              x2={cx + (r - thickness / 2 - 1) * Math.cos(rad)}
              y2={cy + (r - thickness / 2 - 1) * Math.sin(rad)}
              stroke="rgba(90,103,133,0.5)"
              strokeWidth={1}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="mono text-[2.4rem] font-bold leading-none" style={{ color }}>
          {value.toFixed(1)}
        </div>
        {label && (
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color }}>
            {label}
          </div>
        )}
        {sublabel && <div className="mt-0.5 text-[10.5px] text-ink-400">{sublabel}</div>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- FactorBars */

export function FactorBars({
  factors,
}: {
  factors: { label: string; score: number; weight: number; z: number; direction: string; explain: string }[];
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  return (
    <div className="space-y-2.5 px-5 pb-5">
      {factors.map((f) => {
        const color =
          f.direction === "bullish" ? "#22c55e" : f.direction === "bearish" ? "#ef4444" : "#8290ad";
        const isOpen = open === f.label;
        return (
          <div key={f.label}>
            <button
              onClick={() => setOpen(isOpen ? null : f.label)}
              className="group w-full text-left"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-ink-200 group-hover:text-ink-50 transition-colors">
                  {f.label}
                  <span className="ml-1.5 text-[10px] text-ink-500">w{f.weight}</span>
                </span>
                <span className="mono shrink-0 text-[11.5px]" style={{ color }}>
                  {f.score.toFixed(0)}
                  <span className="ml-1.5 text-ink-500">
                    {f.z >= 0 ? "+" : ""}
                    {f.z.toFixed(2)}σ
                  </span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-750">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${f.score}%`, background: color }}
                />
              </div>
            </button>
            {isOpen && (
              <p className="animate-fade-up mt-2 rounded-lg border border-ink-700/60 bg-ink-850/70 px-3 py-2 text-[11.5px] leading-relaxed text-ink-300">
                {f.explain}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------ LiquidationMap */

export function LiquidationHeatmap({
  levels,
  price,
}: {
  levels: { price: number; side: "long" | "short"; notional: number; distancePct: number; intensity: number }[];
  price: number;
}) {
  const sorted = [...levels].sort((a, b) => b.price - a.price);
  const maxNotional = Math.max(...levels.map((l) => l.notional));
  return (
    <div className="px-5 pb-5">
      <div className="space-y-1">
        {sorted.map((l, i) => {
          const isShort = l.side === "short";
          const color = isShort ? "#ef4444" : "#22c55e";
          const w = (l.notional / maxNotional) * 100;
          const insertSpot =
            i < sorted.length - 1 && sorted[i].price > price && sorted[i + 1].price < price;
          return (
            <React.Fragment key={`${l.side}-${l.price}`}>
              <div className="group flex items-center gap-2">
                <span className="mono w-[74px] shrink-0 text-right text-[10.5px] text-ink-400">
                  {fmtUsd(l.price, { dp: l.price < 100 ? 2 : 0 })}
                </span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-ink-850/60">
                  <div
                    className="h-full rounded transition-all duration-500 group-hover:brightness-125"
                    style={{
                      width: `${w}%`,
                      background: `linear-gradient(90deg, ${color}dd, ${color}55)`,
                    }}
                  />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium text-ink-100/90">
                    {fmtUsd(l.notional, { compact: true })} {l.side}
                  </span>
                </div>
                <span className="mono w-[46px] shrink-0 text-[10px] text-ink-500">
                  {l.distancePct > 0 ? "+" : ""}
                  {l.distancePct.toFixed(1)}%
                </span>
              </div>
              {insertSpot && (
                <div className="flex items-center gap-2 py-1">
                  <span className="mono w-[74px] shrink-0 text-right text-[10.5px] font-semibold text-brand-400">
                    {fmtUsd(price)}
                  </span>
                  <div className="relative flex-1">
                    <div className="h-px w-full bg-brand-500/70" />
                    <span className="absolute -top-1.5 left-2 rounded bg-brand-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-950">
                      spot
                    </span>
                  </div>
                  <span className="w-[46px]" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- MiniBarRow */

export function DistributionBar({
  segments,
  height = 8,
}: {
  segments: { label: string; value: number; color: string }[];
  height?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <div>
      <div className="flex w-full overflow-hidden rounded-full" style={{ height }}>
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${((s.value / total) * 100).toFixed(1)}%`}
            style={{ width: `${(s.value / total) * 100}%`, background: s.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-[10.5px] text-ink-400">{s.label}</span>
            <span className="mono text-[10.5px] text-ink-200">
              {((s.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- RankBars */

export function HBarChart({
  data,
  height = 230,
  color = "#2dd4bf",
  domain,
}: {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  color?: string;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="rgba(90,103,133,0.13)" horizontal={false} />
        <XAxis type="number" {...AXIS} tickLine={false} axisLine={false} domain={domain ?? [0, "auto"]} />
        <YAxis
          type="category"
          dataKey="name"
          {...AXIS}
          tickLine={false}
          axisLine={false}
          width={96}
        />
        <Tooltip
          cursor={{ fill: "rgba(90,103,133,0.08)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TipShell>
                <span className="mono text-ink-50">
                  {payload[0].payload.name}: {Number(payload[0].value).toFixed(1)}
                </span>
              </TipShell>
            ) : null
          }
        />
        <Bar dataKey="value" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendPill({ value, className }: { value: number; className?: string }) {
  const pos = value >= 0;
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-medium",
        pos ? "bg-green-500/12 text-green-400" : "bg-red-500/12 text-red-400",
        className
      )}
    >
      {pos ? "▲" : "▼"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}
