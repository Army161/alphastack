"use client";

import * as React from "react";
import { AlertTriangle, Bell, CheckCircle2, Flame, Zap } from "lucide-react";
import type { RadarReading } from "@/lib/modules/radar";
import { CROWD_COLORS } from "@/lib/modules/radar";
import { Card, CardHeader, Badge, Button, Select, Stat, TabBar, Meter } from "@/components/ui/primitives";
import { ScoreGauge, LiquidationHeatmap, DualAxisChart, DistributionBar, PriceChart } from "@/components/charts";
import { DataSourceRow } from "@/components/ui/DataSource";
import { fmtUsd } from "@/lib/utils";

type Tab = "levels" | "history" | "triggers";

export function RadarView({
  reading,
  assets,
  asset,
}: {
  reading: RadarReading;
  assets: string[];
  asset: string;
}) {
  const [tab, setTab] = React.useState<Tab>("levels");
  const [armed, setArmed] = React.useState<Record<string, boolean>>(
    Object.fromEntries(reading.triggers.map((t) => [t.id, t.fired]))
  );
  const color = CROWD_COLORS[reading.crowdingLabel];
  const fired = reading.triggers.filter((t) => t.fired);

  function onAssetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set("asset", e.target.value);
    window.location.href = url.toString();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={asset} onChange={onAssetChange} className="w-[120px]">
          {assets.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Badge tone={fired.length >= 2 ? "neg" : fired.length ? "warn" : "pos"} dot>
          {fired.length} of {reading.triggers.length} triggers fired
        </Badge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DataSourceRow
            items={[
              { label: "price", prov: reading.prov.price },
              { label: "derivs", prov: reading.prov.derivatives },
              { label: "liq", prov: reading.prov.liquidations },
            ]}
          />
          <Badge tone="neutral">Spot {fmtUsd(reading.price, { dp: reading.price < 10 ? 2 : 0 })}</Badge>
        </div>
      </div>

      {/* Critical banner */}
      {reading.crowdingIndex >= 72 && (
        <Card glow="#ef4444">
          <div className="flex items-start gap-3 p-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-400">
              <Flame size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-red-400">
                  {reading.crowdingLabel.toUpperCase()}
                </span>
                <Badge tone="neg">Est. cascade {fmtUsd(reading.estimatedCascade, { compact: true })}</Badge>
              </div>
              <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-ink-200">
                {reading.verdict}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="space-y-4">
          <Card glow={color}>
            <div className="flex flex-col items-center px-5 py-6">
              <ScoreGauge
                value={reading.crowdingIndex}
                color={color}
                label={reading.crowdingLabel}
                sublabel={`${reading.dominantSide}s dominant`}
              />
              <div className="mt-5 w-full space-y-3">
                <MiniRow
                  label="Funding z-score"
                  value={`${reading.fundingZ >= 0 ? "+" : ""}${reading.fundingZ}σ`}
                  pct={Math.min(100, (Math.abs(reading.fundingZ) / 3) * 100)}
                  color={Math.abs(reading.fundingZ) >= 2 ? "#ef4444" : "#eab308"}
                />
                <MiniRow
                  label="OI % of market cap"
                  value={`${reading.oiPctOfMcap}%`}
                  pct={Math.min(100, (reading.oiPctOfMcap / 6) * 100)}
                  color="#f97316"
                />
                <MiniRow
                  label="Long / short ratio"
                  value={reading.longShortRatio.toFixed(2)}
                  pct={Math.min(100, (reading.longShortRatio / 3) * 100)}
                  color={reading.longShortRatio > 1.8 ? "#ef4444" : "#38bdf8"}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="24h liquidations" accent="#ef4444" />
            <div className="px-5 pb-5">
              <div className="mono mb-3 text-2xl font-semibold text-ink-50">
                {fmtUsd(reading.liq24h, { compact: true })}
              </div>
              <DistributionBar
                segments={[
                  { label: "Longs", value: reading.liq24hLongs, color: "#22c55e" },
                  { label: "Shorts", value: reading.liq24hShorts, color: "#ef4444" },
                ]}
              />
              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
                This is capital that is gone permanently — not a drawdown that recovers. It is also
                what pins price at levels the market cannot break through.
              </p>
            </div>
          </Card>

          <Card>
            <Stat
              label="Open interest"
              value={fmtUsd(reading.openInterest, { compact: true })}
              tone={reading.oiChange24h >= 0 ? "neg" : "pos"}
              sub={`OI ${reading.oiChange24h >= 0 ? "+" : ""}${reading.oiChange24h}% vs price ${reading.priceChange24h >= 0 ? "+" : ""}${reading.priceChange24h}% — ${
                reading.oiChange24h > 4 && Math.abs(reading.priceChange24h) < 1.2
                  ? "leverage building without spot support"
                  : "positioning tracking price"
              }`}
            />
            {reading.oiIsEstimate && reading.venueOi !== null && (
              <p className="px-5 pb-4 text-[11px] leading-relaxed text-ink-500">
                Market-wide estimate. {reading.venue?.toUpperCase()} publishes{" "}
                <span className="mono text-ink-300">{fmtUsd(reading.venueOi, { compact: true })}</span>{" "}
                on its own book; that is grossed up by the venue&rsquo;s approximate share of global
                perp open interest. Funding and long/short are ratios and need no adjustment.
              </p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <TabBar<Tab>
              tabs={[
                { id: "levels", label: "Magnet levels", count: reading.levels.length },
                { id: "history", label: "90-day history" },
                { id: "triggers", label: "Alert triggers", count: fired.length },
              ]}
              value={tab}
              onChange={setTab}
              accent={color}
            />

            {tab === "levels" && (
              <div className="pt-4">
                <p className="px-5 pb-3 text-[11.5px] leading-relaxed text-ink-500">
                  Clustered liquidation density above and below spot. Price is magnetised toward
                  these levels because clearing them is where the liquidity sits.
                </p>
                <LiquidationHeatmap levels={reading.levels} price={reading.price} />
                <div className="mx-5 mb-5 rounded-lg border border-ink-700/60 bg-ink-850/40 p-4">
                  <div className="flex items-center gap-2">
                    <Zap size={13} className="text-amber-400" />
                    <span className="text-[12px] font-medium text-ink-100">Cascade estimate</span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
                    If the nearest {reading.dominantSide} cluster clears, roughly{" "}
                    <strong className="text-ink-200">
                      {fmtUsd(reading.estimatedCascade, { compact: true })}
                    </strong>{" "}
                    of forced flow hits the tape, amplified by the current crowding level. That is
                    the mechanism behind billion-dollar liquidation days.
                  </p>
                </div>
              </div>
            )}

            {tab === "history" && (
              <div className="px-2 pb-4 pt-4">
                <div className="px-3 pb-2 text-[11.5px] text-ink-500">
                  Open interest (bars) against crowding index (line)
                </div>
                <DualAxisChart
                  data={reading.history}
                  barKey="oi"
                  lineKey="crowding"
                  barLabel="Open interest"
                  lineLabel="Crowding"
                  lineColor={color}
                />
                <div className="mt-4 px-3 pb-2 text-[11.5px] text-ink-500">
                  Daily liquidations — note the spikes cluster where crowding peaked
                </div>
                <PriceChart
                  data={reading.history.map((h) => ({ t: h.t, c: h.liq }))}
                  color="#ef4444"
                  height={140}
                />
              </div>
            )}

            {tab === "triggers" && (
              <div className="space-y-2.5 p-5">
                {reading.triggers.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border p-4 transition-colors"
                    style={{
                      borderColor: t.fired
                        ? t.severity === "critical"
                          ? "rgba(239,68,68,0.35)"
                          : "rgba(245,158,11,0.35)"
                        : "rgba(90,103,133,0.22)",
                      background: t.fired
                        ? t.severity === "critical"
                          ? "rgba(239,68,68,0.05)"
                          : "rgba(245,158,11,0.05)"
                        : undefined,
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {t.fired ? (
                        <AlertTriangle
                          size={15}
                          className={`mt-0.5 shrink-0 ${t.severity === "critical" ? "text-red-400" : "text-amber-400"}`}
                        />
                      ) : (
                        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ink-600" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-ink-100">{t.label}</span>
                          <Badge
                            tone={t.fired ? (t.severity === "critical" ? "neg" : "warn") : "neutral"}
                          >
                            {t.fired ? "FIRED" : "clear"}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-[12px] leading-relaxed text-ink-400">{t.detail}</p>
                      </div>
                      <button
                        onClick={() => setArmed((a) => ({ ...a, [t.id]: !a[t.id] }))}
                        className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                          armed[t.id]
                            ? "border-brand-500/40 bg-brand-500/10 text-brand-400"
                            : "border-ink-700/60 text-ink-400 hover:text-ink-200"
                        }`}
                      >
                        <Bell size={11} className="mr-1 inline" />
                        {armed[t.id] ? "Armed" : "Arm"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Read" accent={color} />
            <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-200">{reading.verdict}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniRow({
  label, value, pct, color,
}: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] text-ink-400">{label}</span>
        <span className="mono text-[12px] font-medium" style={{ color }}>{value}</span>
      </div>
      <Meter value={pct} color={color} className="mt-1.5" height={4} />
    </div>
  );
}
