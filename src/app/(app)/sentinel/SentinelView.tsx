"use client";

import * as React from "react";
import {
  AlertTriangle, Check, ChevronDown, Copy, FileCode2, Loader2, Play,
  Shield, ShieldCheck, Sparkles, X, Zap,
} from "lucide-react";
import type { ScanResult, Finding, Severity } from "@/lib/modules/sentinel";
import { SEVERITY_COLORS } from "@/lib/modules/sentinel";
import { Card, CardHeader, Badge, Button, Textarea, Input, Stat, TabBar, Meter, EmptyState } from "@/components/ui/primitives";
import { ScoreGauge, DistributionBar } from "@/components/charts";
import { cn } from "@/lib/utils";

type Tab = "findings" | "refuted" | "gas" | "passes";

export function SentinelView({ sample }: { sample: string }) {
  const [source, setSource] = React.useState("");
  const [target, setTarget] = React.useState("MyContract.sol");
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<Tab>("findings");
  const [open, setOpen] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string[]>([]);

  async function run(useSample = false) {
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress([]);

    const steps = [
      "Parsing Solidity source…",
      "Pass 1 — static rule corpus (15 exploit classes)…",
      "Pass 2 — adversarial refutation…",
      "Scoring and grading…",
    ];
    for (const s of steps) {
      setProgress((p) => [...p, s]);
      await new Promise((r) => setTimeout(r, 190));
    }

    try {
      const res = await fetch("/api/v1/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool: "scan_contract",
          input: useSample
            ? { useSample: true, target: "VulnerableVault.sol" }
            : { source, target },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Scan failed");
      setResult(json.data as ScanResult);
      setTab("findings");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  const sevCounts = result
    ? (["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => ({
        label: s,
        value: result.findings.filter((f) => f.severity === s).length,
        color: SEVERITY_COLORS[s],
      })).filter((x) => x.value > 0)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        {/* Input */}
        <Card className="overflow-hidden">
          <CardHeader
            title="Source input"
            subtitle="Paste Solidity, or load the deliberately vulnerable sample"
            accent="#f97316"
            action={
              <Button size="sm" variant="ghost" onClick={() => setSource(sample)}>
                <FileCode2 size={12} /> Load sample
              </Button>
            }
          />
          <div className="space-y-3 px-5 pb-5">
            <Input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Contract name or address"
            />
            <Textarea
              value={source}
              onChange={(e) => setSource(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder="// SPDX-License-Identifier: MIT&#10;pragma solidity ^0.8.20;&#10;&#10;contract MyContract { ... }"
              className="mono text-[11.5px] leading-relaxed"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => run(false)} disabled={busy || source.trim().length < 30}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={13} />}
                {busy ? "Scanning…" : "Run scan"}
              </Button>
              <Button variant="secondary" onClick={() => run(true)} disabled={busy}>
                <Zap size={13} /> Scan the vulnerable sample
              </Button>
              {source && (
                <Button variant="ghost" onClick={() => setSource("")} disabled={busy}>
                  <X size={13} /> Clear
                </Button>
              )}
            </div>

            {progress.length > 0 && busy && (
              <div className="space-y-1.5 rounded-lg border border-ink-700/60 bg-ink-850/50 p-3">
                {progress.map((p, i) => (
                  <div key={p} className="flex items-center gap-2 text-[11.5px] text-ink-300">
                    {i === progress.length - 1 ? (
                      <Loader2 size={11} className="animate-spin text-orange-400" />
                    ) : (
                      <Check size={11} className="text-green-400" />
                    )}
                    {p}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-400" />
                <span className="text-[12px] text-red-300">{error}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Score */}
        <div className="space-y-4">
          {result ? (
            <>
              <Card glow={result.riskScore >= 78 ? "#22c55e" : result.riskScore >= 45 ? "#f59e0b" : "#ef4444"}>
                <div className="flex flex-col items-center px-5 py-6">
                  <ScoreGauge
                    value={result.riskScore}
                    color={result.riskScore >= 78 ? "#22c55e" : result.riskScore >= 45 ? "#f59e0b" : "#ef4444"}
                    label={`Grade ${result.grade}`}
                    sublabel={`${result.findings.length} confirmed finding${result.findings.length === 1 ? "" : "s"}`}
                    size={156}
                  />
                  {sevCounts.length > 0 && (
                    <div className="mt-5 w-full">
                      <DistributionBar segments={sevCounts} />
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <div className="grid grid-cols-2 divide-x divide-ink-700/50">
                  <Stat label="Lines" value={result.linesScanned} />
                  <Stat label="Functions" value={result.functionsAnalysed} />
                </div>
                <div className="grid grid-cols-2 divide-x divide-ink-700/50 border-t border-ink-700/50">
                  <Stat label="Refuted" value={result.refuted.length} accent="#8290ad" />
                  <Stat label="Duration" value={`${result.durationMs}ms`} />
                </div>
              </Card>

              <Card>
                <CardHeader title="Summary" accent="#f97316" />
                <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-200">
                  {result.summary}
                </p>
              </Card>
            </>
          ) : (
            <Card>
              <div className="px-5 py-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/12 text-orange-400">
                  <Shield size={22} />
                </div>
                <h3 className="mt-3 text-[14px] font-semibold text-ink-100">Three-pass scanner</h3>
                <div className="mt-4 space-y-2.5 text-left">
                  {[
                    ["Static rule corpus", "15 exploit classes derived from the incidents that actually lost money — reentrancy, oracle manipulation, access control, proxy takeover, signature replay."],
                    ["Guard detection", "A rule only fires when the corresponding guard is genuinely absent, not merely because a keyword appears."],
                    ["Adversarial refutation", "Each finding is re-examined with the burden of proof inverted. Anything refuted is dropped — false positives are why scanners get ignored."],
                  ].map(([t, d]) => (
                    <div key={t} className="rounded-lg border border-ink-700/60 bg-ink-850/40 p-3">
                      <div className="text-[12px] font-medium text-ink-100">{t}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <Card className="overflow-hidden">
          <TabBar<Tab>
            tabs={[
              { id: "findings", label: "Confirmed", count: result.findings.length },
              { id: "refuted", label: "Refuted", count: result.refuted.length },
              { id: "gas", label: "Gas notes", count: result.gasNotes.length },
              { id: "passes", label: "Pass detail" },
            ]}
            value={tab}
            onChange={setTab}
            accent="#f97316"
          />

          {tab === "findings" && (
            <div className="p-4">
              {result.findings.length === 0 ? (
                <EmptyState
                  title="Nothing survived verification"
                  body="The static pass raised candidates, but none survived the adversarial refutation. That is a clean result — not an empty one."
                />
              ) : (
                <div className="space-y-2">
                  {result.findings.map((f) => (
                    <FindingCard
                      key={f.id}
                      f={f}
                      open={open === f.id}
                      onToggle={() => setOpen(open === f.id ? null : f.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "refuted" && (
            <div className="p-4">
              {result.refuted.length === 0 ? (
                <EmptyState title="Nothing refuted" body="Every static candidate survived the adversarial pass." />
              ) : (
                <div className="space-y-2">
                  <p className="mb-3 text-[11.5px] leading-relaxed text-ink-500">
                    These matched a rule but were dropped during verification. Showing them is the
                    point — a scanner that hides its refutations is asking you to trust it blindly.
                  </p>
                  {result.refuted.map((f) => (
                    <div key={f.id} className="rounded-xl border border-ink-700/60 bg-ink-850/25 p-3.5 opacity-75">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">{f.rule}</Badge>
                        <span className="text-[12.5px] text-ink-300 line-through">{f.title}</span>
                        <span className="mono ml-auto text-[11px] text-ink-500">L{f.line}</span>
                      </div>
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-ink-900/60 px-3 py-2">
                        <ShieldCheck size={12} className="mt-0.5 shrink-0 text-green-400" />
                        <span className="text-[11.5px] leading-relaxed text-ink-400">
                          {f.refutation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "gas" && (
            <div className="p-5">
              {result.gasNotes.length === 0 ? (
                <EmptyState title="No gas notes" body="No obvious optimisation patterns detected." />
              ) : (
                <ul className="space-y-2">
                  {result.gasNotes.map((n, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 rounded-lg border border-ink-700/60 bg-ink-850/40 px-3.5 py-2.5"
                    >
                      <Sparkles size={12} className="mt-0.5 shrink-0 text-amber-400" />
                      <span className="text-[12px] leading-relaxed text-ink-300">{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "passes" && (
            <div className="p-5">
              <div className="space-y-2">
                {result.passes.map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center gap-3 rounded-lg border border-ink-700/60 bg-ink-850/40 px-4 py-3"
                  >
                    <Check size={13} className="shrink-0 text-green-400" />
                    <span className="text-[12.5px] text-ink-100">{p.name}</span>
                    <span className="mono ml-auto text-[11.5px] text-ink-400">
                      {p.findings} finding{p.findings === 1 ? "" : "s"}
                    </span>
                    <span className="mono w-12 text-right text-[11.5px] text-ink-500">{p.ms}ms</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-ink-700/60 bg-ink-850/40 p-4">
                <div className="text-[12px] font-semibold text-ink-100">Why the adversarial pass matters</div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
                  Static scanners fail commercially because their false-positive rate trains people
                  to ignore them. Inverting the burden of proof on every candidate — asking &ldquo;why is
                  this NOT exploitable&rdquo; — is what makes the output short enough to act on. The
                  refuted list stays visible so nothing is hidden.
                </p>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function FindingCard({ f, open, onToggle }: { f: Finding; open: boolean; onToggle: () => void }) {
  const color = SEVERITY_COLORS[f.severity];
  const [copied, setCopied] = React.useState(false);

  return (
    <div
      className="overflow-hidden rounded-xl border transition-colors"
      style={{ borderColor: `${color}33`, background: `${color}07` }}
    >
      <button onClick={onToggle} className="flex w-full items-start gap-3 p-3.5 text-left">
        <span
          className="mt-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
          style={{ background: `${color}22`, color }}
        >
          {f.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-ink-50">{f.title}</span>
            <Badge tone="neutral">{f.rule}</Badge>
          </div>
          <div className="mono mt-1 text-[11px] text-ink-500">
            {f.category} · line {f.line} · confidence {(f.confidence * 100).toFixed(0)}%
          </div>
        </div>
        <ChevronDown
          size={15}
          className={cn("mt-0.5 shrink-0 text-ink-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="animate-fade-up space-y-3 border-t px-3.5 py-3.5" style={{ borderColor: `${color}22` }}>
          <div>
            <div className="mono mb-1 text-[10px] uppercase tracking-wider text-ink-500">
              Line {f.line}
            </div>
            <pre className="mono overflow-x-auto rounded-lg bg-ink-950 p-2.5 text-[11px] text-ink-200">
              {f.snippet}
            </pre>
          </div>

          <Section title="Exploit scenario" body={f.exploitScenario} />
          <Section title="Remediation" body={f.remediation} />

          {f.patch && (
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-ink-500">Suggested patch</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(f.patch!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1600);
                  }}
                  className="ml-auto flex items-center gap-1 text-[10.5px] text-ink-400 hover:text-ink-100"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mono overflow-x-auto rounded-lg border border-green-500/20 bg-green-500/[0.04] p-2.5 text-[11px] text-green-300">
                {f.patch}
              </pre>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-ink-900/60 px-3 py-2">
            <AlertTriangle size={11} className="mt-0.5 shrink-0 text-ink-500" />
            <span className="text-[11px] leading-relaxed text-ink-500">
              Precedent: {f.reference}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Meter value={f.confidence * 100} color={color} className="flex-1" height={4} />
            <span className="mono text-[10.5px] text-ink-400">
              {f.verdict} · {(f.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-ink-500">{title}</div>
      <p className="text-[12px] leading-relaxed text-ink-300">{body}</p>
    </div>
  );
}
