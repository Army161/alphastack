"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, Bell, Download } from "lucide-react";
import type { ExhaustionReading } from "@/lib/modules/exhaustion";
import { REGIME_COLORS } from "@/lib/modules/exhaustion";
import { Card, CardHeader, Badge, Button, Select, Stat, TabBar } from "@/components/ui/primitives";
import { ScoreGauge, FactorBars, PriceChart } from "@/components/charts";
import { DataSource } from "@/components/ui/DataSource";
import { fmtUsd } from "@/lib/utils";

type Tab = "factors" | "history" | "method";

export function ExhaustionView({
  reading,
  assets,
  asset,
}: {
  reading: ExhaustionReading;
  assets: string[];
  asset: string;
}) {
  const [tab, setTab] = React.useState<Tab>("factors");
  const [alerted, setAlerted] = React.useState(false);
  const color = REGIME_COLORS[reading.regime];

  const bullish = reading.factors.filter((f) => f.direction === "bullish").length;
  const bearish = reading.factors.filter((f) => f.direction === "bearish").length;

  function onAssetChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href);
    url.searchParams.set("asset", e.target.value);
    window.location.href = url.toString();
  }

  function exportCsv() {
    const rows = [
      ["day", "score", "price"],
      ...reading.history.map((h) => [h.day, String(h.score), String(h.price)]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ses-${asset}-${reading.day}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={asset} onChange={onAssetChange} className="w-[120px]">
          {assets.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Button
          size="md"
          variant={alerted ? "secondary" : "outline"}
          onClick={() => setAlerted((v) => !v)}
        >
          <Bell size={13} /> {alerted ? "Alert armed" : "Alert on regime change"}
        </Button>
        <Button size="md" variant="ghost" onClick={exportCsv}>
          <Download size={13} /> Export CSV
        </Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <DataSource prov={reading.prov} label="price" />
          {reading.sentiment && (
            <Badge tone={reading.sentiment.value >= 55 ? "pos" : reading.sentiment.value <= 35 ? "neg" : "warn"}>
              F&amp;G {reading.sentiment.value} · {reading.sentiment.classification}
            </Badge>
          )}
          <Badge tone="neutral" dot>{reading.day}</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Gauge column */}
        <div className="space-y-4">
          <Card glow={color}>
            <div className="flex flex-col items-center px-5 py-6">
              <ScoreGauge
                value={reading.score}
                color={color}
                label={reading.regime}
                sublabel={`${reading.delta >= 0 ? "+" : ""}${reading.delta} vs prior`}
              />
              <div className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-850/60 py-2">
                  <div className="mono text-[15px] font-semibold text-green-400">{bullish}</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Bullish</div>
                </div>
                <div className="rounded-lg bg-ink-850/60 py-2">
                  <div className="mono text-[15px] font-semibold text-ink-300">
                    {6 - bullish - bearish}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Neutral</div>
                </div>
                <div className="rounded-lg bg-ink-850/60 py-2">
                  <div className="mono text-[15px] font-semibold text-red-400">{bearish}</div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-500">Bearish</div>
                </div>
              </div>
            </div>
          </Card>

          {/* Override */}
          <Card
            glow={
              reading.override.active
                ? reading.override.adjustment > 0
                  ? "#22c55e"
                  : "#ef4444"
                : undefined
            }
          >
            <CardHeader
              title="Whale absorption override"
              accent={reading.override.adjustment > 0 ? "#22c55e" : reading.override.adjustment < 0 ? "#ef4444" : "#5a6785"}
              action={
                <Badge
                  tone={
                    !reading.override.active
                      ? "neutral"
                      : reading.override.adjustment > 0
                        ? "pos"
                        : "neg"
                  }
                >
                  {reading.override.adjustment >= 0 ? "+" : ""}
                  {reading.override.adjustment}
                </Badge>
              }
            />
            <div className="px-5 pb-5">
              <div className="flex items-start gap-2.5">
                {reading.override.active ? (
                  reading.override.adjustment > 0 ? (
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-400" />
                  ) : (
                    <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-400" />
                  )
                ) : (
                  <Info size={15} className="mt-0.5 shrink-0 text-ink-500" />
                )}
                <div>
                  <div className="text-[12.5px] font-medium text-ink-100">
                    {reading.override.label}
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">
                    {reading.override.detail}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <Stat
              label="Structural invalidation"
              value={fmtUsd(reading.invalidation)}
              sub={`Spot ${fmtUsd(reading.price)} — ${(((reading.price - reading.invalidation) / reading.invalidation) * 100).toFixed(1)}% above the line. A daily close below invalidates the thesis.`}
              tone={reading.price > reading.invalidation ? "pos" : "neg"}
            />
          </Card>
        </div>

        {/* Main column */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Daily read"
              subtitle={`${reading.asset} · generated ${reading.day}`}
              accent={color}
            />
            <p className="px-5 pb-5 text-[13px] leading-relaxed text-ink-200">
              {reading.narrative}
            </p>
          </Card>

          <Card className="overflow-hidden">
            <TabBar<Tab>
              tabs={[
                { id: "factors", label: "Factor breakdown", count: 6 },
                { id: "history", label: "Score history" },
                { id: "method", label: "Methodology" },
              ]}
              value={tab}
              onChange={setTab}
              accent={color}
            />

            {tab === "factors" && (
              <div className="pt-4">
                <p className="px-5 pb-3 text-[11.5px] text-ink-500">
                  Click any factor to see what the reading means. Weights sum to 100.
                </p>
                <FactorBars factors={reading.factors} />
              </div>
            )}

            {tab === "history" && (
              <div className="px-2 pb-4 pt-4">
                <div className="px-3 pb-2 text-[11.5px] text-ink-500">
                  180-day SES history. The score leads price at turns — that is the whole point of
                  the model.
                </div>
                <PriceChart
                  data={reading.history.map((h) => ({ t: h.day, c: h.score }))}
                  color={color}
                  height={230}
                  currency={false}
                  refLines={[
                    { y: 28, label: "Exhaustion", color: "#f97316" },
                    { y: 58, label: "Recovery", color: "#22c55e" },
                  ]}
                />
                <div className="mt-4 px-3 pb-1 text-[11.5px] text-ink-500">Price over the same window</div>
                <PriceChart
                  data={reading.history.map((h) => ({ t: h.day, c: h.price }))}
                  color="#8290ad"
                  height={150}
                  refLines={[{ y: reading.invalidation, label: "Invalidation", color: "#ef4444" }]}
                />
              </div>
            )}

            {tab === "method" && (
              <div className="space-y-4 p-5">
                <p className="text-[12.5px] leading-relaxed text-ink-300">
                  SES is a weighted composite of six independently measurable capitulation factors.
                  Each is z-scored against a two-year trailing window, mapped to 0–100, then weighted:
                </p>
                <div className="overflow-hidden rounded-lg border border-ink-700/60">
                  {reading.factors.map((f, i) => (
                    <div
                      key={f.key}
                      className={`flex items-center justify-between gap-4 px-4 py-2.5 ${i % 2 ? "bg-ink-850/40" : ""}`}
                    >
                      <span className="text-[12.5px] text-ink-200">{f.label}</span>
                      <span className="mono text-[12px] text-ink-400">weight {f.weight}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[12.5px] leading-relaxed text-ink-300">
                  The <strong className="text-ink-100">whale-absorption override</strong> then applies
                  a bounded adjustment (+8 / −9). It fires when a top-5 known holder distributes inside a
                  21-day confirmation window: if price does <em>not</em> set a lower low, the market
                  has demonstrated it can absorb the largest identifiable seller — the highest
                  conviction bottom signal available. If price <em>does</em> break lower on that
                  distribution, the adjustment inverts.
                </p>
                <div className="rounded-lg border border-ink-700/60 bg-ink-850/40 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                    Regime bands
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {[
                      ["Capitulation", "0–27"],
                      ["Exhaustion", "28–43"],
                      ["Accumulation", "44–57"],
                      ["Recovery", "58–71"],
                      ["Expansion", "72–87"],
                      ["Euphoria", "88–100"],
                    ].map(([name, range]) => (
                      <div key={name} className="flex items-center gap-2.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: REGIME_COLORS[name as keyof typeof REGIME_COLORS] }}
                        />
                        <span className="text-[12px] text-ink-200">{name}</span>
                        <span className="mono ml-auto text-[11.5px] text-ink-500">{range}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
