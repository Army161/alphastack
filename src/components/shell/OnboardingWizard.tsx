"use client";

import * as React from "react";
import { Check, ChevronRight, Plus, Trash2, Zap, Shield, Rocket, Scale } from "lucide-react";
import { Button, Input, Select, Badge } from "@/components/ui/primitives";
import { ALLOCATION_PROFILES } from "@/lib/modules/ladder";
import { MODULES } from "@/lib/modules/registry";
import { fmtUsd, cn } from "@/lib/utils";

type Row = { symbol: string; quantity: string; costBasis: string };

const PROFILES = [
  {
    id: "conservative" as const,
    icon: Shield,
    name: "Conservative",
    desc: "80% core anchor, 20% satellite. Tight 8pp drift bands.",
    color: "#38bdf8",
  },
  {
    id: "balanced" as const,
    icon: Scale,
    name: "Balanced",
    desc: "72% core, 28% satellite — the framework's default barbell. 10pp bands.",
    color: "#2dd4bf",
  },
  {
    id: "aggressive" as const,
    icon: Rocket,
    name: "Aggressive",
    desc: "55% core, 45% satellite. Sits at the 50% core floor. 12pp bands.",
    color: "#f97316",
  },
];

export function OnboardingWizard({
  action,
  prices,
}: {
  action: (fd: FormData) => void;
  prices: Record<string, number>;
}) {
  const [step, setStep] = React.useState(0);
  const [profile, setProfile] = React.useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [rows, setRows] = React.useState<Row[]>([
    { symbol: "BTC", quantity: "", costBasis: "" },
  ]);

  const symbols = Object.keys(prices);
  const totalValue = rows.reduce(
    (s, r) => s + (parseFloat(r.quantity) || 0) * (prices[r.symbol] ?? 0),
    0
  );
  const coreValue = rows
    .filter((r) => r.symbol === "BTC")
    .reduce((s, r) => s + (parseFloat(r.quantity) || 0) * (prices[r.symbol] ?? 0), 0);
  const corePct = totalValue > 0 ? (coreValue / totalValue) * 100 : 0;
  const target = ALLOCATION_PROFILES[profile];

  const steps = ["Risk profile", "Positions", "Ready"];

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Stepper */}
      <div className="mb-8 flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold transition-colors",
                  i < step
                    ? "bg-brand-500 text-ink-950"
                    : i === step
                      ? "bg-brand-500/20 text-brand-400 ring-1 ring-brand-500/50"
                      : "bg-ink-800 text-ink-500"
                )}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-[12.5px] font-medium sm:block",
                  i === step ? "text-ink-100" : "text-ink-500"
                )}
              >
                {s}
              </span>
            </div>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-ink-700/60" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0 */}
      {step === 0 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink-50">
            How do you want the Ladder to hold you accountable?
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
            This sets your core/satellite target and drift bands. The engine flags when you move
            outside them — it never trades, it only tells you what your own rule says.
          </p>

          <div className="mt-6 space-y-2.5">
            {PROFILES.map((p) => {
              const Icon = p.icon;
              const active = profile === p.id;
              const t = ALLOCATION_PROFILES[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => setProfile(p.id)}
                  className={cn(
                    "flex w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-brand-500/50 bg-brand-500/[0.06]"
                      : "border-ink-700/60 bg-ink-850/40 hover:border-ink-600"
                  )}
                >
                  <div
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${p.color}1a`, color: p.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-ink-50">{p.name}</span>
                      {p.id === "balanced" && <Badge tone="brand">Default</Badge>}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{p.desc}</p>
                    <div className="mono mt-2 flex gap-3 text-[11px] text-ink-500">
                      <span>core {t.core}%</span>
                      <span>satellite {100 - t.core}%</span>
                      <span>band ±{t.band}pp</span>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "mt-1 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border transition-colors",
                      active ? "border-brand-500 bg-brand-500" : "border-ink-600"
                    )}
                  >
                    {active && <Check size={10} className="text-ink-950" />}
                  </div>
                </button>
              );
            })}
          </div>

          <Button size="lg" className="mt-6 w-full" onClick={() => setStep(1)}>
            Continue <ChevronRight size={15} />
          </Button>
        </div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="animate-fade-up">
          <h2 className="text-xl font-bold tracking-tight text-ink-50">Add your positions</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
            Powers the Ladder module and your allocation drift. Optional — you can skip and add
            them later. Nothing is ever sent to an exchange.
          </p>

          <div className="mt-6 space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="flex gap-2">
                <Select
                  value={r.symbol}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i].symbol = e.target.value;
                    setRows(next);
                  }}
                  className="w-[104px] shrink-0"
                >
                  {symbols.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
                <Input
                  type="number"
                  step="any"
                  placeholder="Quantity"
                  value={r.quantity}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i].quantity = e.target.value;
                    setRows(next);
                  }}
                />
                <Input
                  type="number"
                  step="any"
                  placeholder={`Cost basis (${fmtUsd(prices[r.symbol] ?? 0, { dp: 0 })})`}
                  value={r.costBasis}
                  onChange={(e) => {
                    const next = [...rows];
                    next[i].costBasis = e.target.value;
                    setRows(next);
                  }}
                />
                <button
                  onClick={() => setRows(rows.filter((_, x) => x !== i))}
                  disabled={rows.length === 1}
                  className="grid h-9.5 w-9.5 shrink-0 place-items-center rounded-lg border border-ink-700/60 text-ink-500 transition-colors hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => setRows([...rows, { symbol: "ETH", quantity: "", costBasis: "" }])}
          >
            <Plus size={13} /> Add position
          </Button>

          {totalValue > 0 && (
            <div className="card mt-5 p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] text-ink-400">Portfolio value</span>
                <span className="mono text-lg font-semibold text-ink-50">
                  {fmtUsd(totalValue)}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-750">
                <div
                  className="h-full bg-brand-500 transition-all duration-500"
                  style={{ width: `${corePct}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11.5px]">
                <span className="text-ink-400">
                  Core {corePct.toFixed(1)}% <span className="text-ink-600">/ target {target.core}%</span>
                </span>
                <span
                  className={
                    Math.abs(corePct - target.core) <= target.band
                      ? "text-green-400"
                      : "text-amber-400"
                  }
                >
                  {Math.abs(corePct - target.core) <= target.band ? "In band" : "Outside band"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" size="lg" onClick={() => setStep(0)}>Back</Button>
            <Button size="lg" className="flex-1" onClick={() => setStep(2)}>
              Continue <ChevronRight size={15} />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form action={action} className="animate-fade-up">
          <input type="hidden" name="riskProfile" value={profile} />
          <input
            type="hidden"
            name="holdings"
            value={JSON.stringify(
              rows
                .filter((r) => parseFloat(r.quantity) > 0)
                .map((r) => ({
                  symbol: r.symbol,
                  quantity: parseFloat(r.quantity),
                  costBasis: parseFloat(r.costBasis) || prices[r.symbol] || 0,
                }))
            )}
          />

          <h2 className="text-xl font-bold tracking-tight text-ink-50">Your workspace is ready</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">
            Seven modules are live. Here is what is waiting for you on the Launchpad.
          </p>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {MODULES.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2.5 rounded-lg border border-ink-700/60 bg-ink-850/40 px-3 py-2.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.accent }} />
                <div className="min-w-0">
                  <div className="text-[12.5px] font-medium text-ink-100">{m.name}</div>
                  <div className="truncate text-[11px] text-ink-500">{m.tagline}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-brand-500/25 bg-brand-500/[0.06] px-4 py-3">
            <Zap size={14} className="mt-0.5 shrink-0 text-brand-400" />
            <p className="text-[12px] leading-relaxed text-ink-300">
              Press <kbd className="mono rounded border border-ink-600 px-1 text-[10px]">⌘K</kbd> anywhere
              to jump between modules, or{" "}
              <kbd className="mono rounded border border-ink-600 px-1 text-[10px]">⌘J</kbd> to open the
              agent dock and ask a question against live module data.
            </p>
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="secondary" size="lg" type="button" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button size="lg" className="flex-1" type="submit">
              Enter workspace <ChevronRight size={15} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
