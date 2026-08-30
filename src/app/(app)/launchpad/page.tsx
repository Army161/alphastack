import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  Activity, ArrowRight, ArrowUpRight, Calendar, Gauge, Radar, Scale,
  Shield, Sparkles, Terminal, TrendingUp, Lock,
} from "lucide-react";
import { MODULES } from "@/lib/modules/registry";
import { computeExhaustion, REGIME_COLORS } from "@/lib/modules/exhaustion";
import { computeRadar, CROWD_COLORS } from "@/lib/modules/radar";
import { computeCatalysts } from "@/lib/modules/catalyst";
import { screen, marketOverview } from "@/lib/modules/terminal";
import { leaderboard, allPredictions } from "@/lib/modules/verdict";
import { evaluateLadder, type Holding, type Rung } from "@/lib/modules/ladder";
import { runScan, SAMPLE_CONTRACT } from "@/lib/modules/sentinel";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { holdings, ladderRungs, scans } from "@/lib/db/schema";
import { Badge, Card, CardHeader, Stat } from "@/components/ui/primitives";
import { Sparkline, TrendPill } from "@/components/charts";
import { getMarketContext } from "@/lib/data/market";
import { StorageNotice } from "@/components/shell/StorageNotice";
import { fmtUsd, fmtPct } from "@/lib/utils";

export const metadata = { title: "Launchpad" };
export const dynamic = "force-dynamic";

const ICONS: Record<string, React.ElementType> = {
  gauge: Gauge, radar: Radar, terminal: Terminal, ladder: TrendingUp,
  shield: Shield, scale: Scale, calendar: Calendar,
};

export default async function LaunchpadPage() {
  const user = (await getCurrentUser())!;

  const market = await getMarketContext();
  const [ses, radar, catalysts, rows, overview, board, preds] = await Promise.all([
    computeExhaustion("BTC", market),
    computeRadar("BTC", market),
    computeCatalysts(),
    screen(market),
    marketOverview(market),
    leaderboard(market),
    allPredictions(market),
  ]);

  const userHoldings = (await db.select().from(holdings).where(eq(holdings.userId, user.id))) as Holding[];
  const userRungs = (await db
    .select()
    .from(ladderRungs)
    .where(eq(ladderRungs.userId, user.id))) as unknown as Rung[];
  const userScans = await db.select().from(scans).where(eq(scans.userId, user.id));

  const ladder =
    userHoldings.length > 0
      ? await evaluateLadder(
          userHoldings,
          userRungs,
          (user.riskProfile as "conservative" | "balanced" | "aggressive") ?? "balanced"
        )
      : null;

  const sampleScan = runScan("sample", SAMPLE_CONTRACT);

  // Per-module live metric for the portfolio grid.
  const metrics: Record<string, { value: string; sub: string; color: string; spark?: number[]; trend?: number }> = {
    exhaustion: {
      value: ses.score.toFixed(1),
      sub: ses.regime,
      color: REGIME_COLORS[ses.regime],
      spark: ses.history.slice(-60).map((h) => h.score),
      trend: ses.delta,
    },
    radar: {
      value: radar.crowdingIndex.toFixed(1),
      sub: `${radar.crowdingLabel} · ${radar.dominantSide}s`,
      color: CROWD_COLORS[radar.crowdingLabel],
      spark: radar.history.slice(-60).map((h) => h.crowding),
    },
    terminal: {
      value: String(rows.filter((r) => r.thesisFit >= 70).length),
      sub: `of ${rows.length} pass the filter`,
      color: "#38bdf8",
      spark: rows.map((r) => r.thesisFit),
    },
    ladder: {
      value: ladder ? fmtUsd(ladder.totalValue, { compact: true }) : "—",
      sub: ladder
        ? `${ladder.rungs.filter((r) => !r.isHit && r.status !== "executed" && r.status !== "skipped").length} rungs armed · core ${ladder.coreAllocation.toFixed(0)}%`
        : "Add positions to activate",
      color: "#a855f7",
      trend: ladder?.totalPnlPct,
    },
    sentinel: {
      value: String(userScans.length || sampleScan.findings.length),
      sub: userScans.length ? "scans run" : `findings in sample (grade ${sampleScan.grade})`,
      color: "#f97316",
    },
    verdict: {
      value: String(preds.length),
      sub: `${preds.filter((p) => p.status === "open").length} open · ${board.length} voices tracked`,
      color: "#eab308",
    },
    catalyst: {
      value: `${catalysts.netSkew > 0 ? "+" : ""}${catalysts.netSkew}`,
      sub: catalysts.next ? `${catalysts.next.title} in ${catalysts.next.daysAway}d` : catalysts.skewLabel,
      color: "#14b8a6",
    },
  };

  const firedTriggers = radar.triggers.filter((t) => t.fired);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <StorageNotice />
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">
            {greeting()}, {user.name?.split(" ")[0] ?? "operator"}
          </h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Seven modules live · {overview.breadth}% breadth · BTC dominance {overview.btcDominance}%
          </p>
        </div>
        <Link href="/chat">
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/[0.07] px-4 py-2.5 transition-colors hover:bg-brand-500/[0.12]">
            <Sparkles size={15} className="text-brand-400" />
            <span className="text-[13px] font-medium text-ink-100">Ask the agent</span>
            <ArrowRight size={13} className="text-brand-400" />
          </div>
        </Link>
      </div>

      {/* Top-line strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <Stat
            label="Seller exhaustion"
            value={ses.score.toFixed(1)}
            accent={REGIME_COLORS[ses.regime]}
            sub={
              <span className="flex items-center gap-1.5">
                {ses.regime} · {ses.delta >= 0 ? "+" : ""}{ses.delta} today
              </span>
            }
          />
        </Card>
        <Card>
          <Stat
            label="Leverage crowding"
            value={radar.crowdingIndex.toFixed(1)}
            accent={CROWD_COLORS[radar.crowdingLabel]}
            sub={`${radar.crowdingLabel} · ${firedTriggers.length} trigger${firedTriggers.length === 1 ? "" : "s"} fired`}
          />
        </Card>
        <Card>
          <Stat
            label="Portfolio"
            value={ladder ? fmtUsd(ladder.totalValue, { compact: true }) : "—"}
            tone={ladder ? (ladder.totalPnl >= 0 ? "pos" : "neg") : "neutral"}
            sub={
              ladder
                ? `${fmtPct(ladder.totalPnlPct)} · core ${ladder.coreAllocation.toFixed(0)}% / target ${ladder.targetCore}%`
                : "No positions yet"
            }
          />
        </Card>
        <Card>
          <Stat
            label="Catalyst skew"
            value={`${catalysts.netSkew > 0 ? "+" : ""}${catalysts.netSkew}`}
            accent="#14b8a6"
            sub={`${catalysts.skewLabel} · ${catalysts.window30d} events in 30d`}
          />
        </Card>
      </div>

      {/* Cross-module signal */}
      <Card glow={firedTriggers.length >= 2 ? "#ef4444" : "#2dd4bf"}>
        <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/12 text-brand-400">
              <Activity size={17} />
            </div>
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                Cross-module read
              </div>
              <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-ink-200">
                {ses.regime === "Capitulation" || ses.regime === "Exhaustion"
                  ? `Exhaustion is in the ${ses.regime.toLowerCase()} band at ${ses.score.toFixed(1)}.`
                  : `Exhaustion has recovered to ${ses.score.toFixed(1)} — ${ses.regime.toLowerCase()} regime.`}{" "}
                {radar.crowdingIndex >= 55
                  ? `But positioning is ${radar.crowdingLabel.toLowerCase()} at ${radar.crowdingIndex.toFixed(1)}, with ${radar.dominantSide}s crowded and ${fmtUsd(radar.liq24h, { compact: true })} liquidated in 24h. Structure and positioning are telling different stories — they resolve on different timescales.`
                  : `Positioning is clean at ${radar.crowdingIndex.toFixed(1)}, so spot-driven moves here have follow-through rather than being leverage echoes.`}{" "}
                {catalysts.next && `Next dated event: ${catalysts.next.title} in ${catalysts.next.daysAway} days.`}
              </p>
            </div>
          </div>
          <Link href="/chat" className="ml-auto shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-ink-600/60 px-3 py-2 text-[12px] font-medium text-ink-200 transition-colors hover:bg-ink-800">
              Dig into this <ArrowUpRight size={13} />
            </span>
          </Link>
        </div>
      </Card>

      {/* Module portfolio grid */}
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.09em] text-ink-300">
            Your modules
          </h2>
          <span className="text-[11.5px] text-ink-500">Click any card to open the product</span>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon] ?? Activity;
            const met = metrics[m.id];
            const locked = m.minPlan !== "free" && user.plan === "free";
            return (
              <Link
                key={m.id}
                href={m.slug}
                className="card group relative overflow-hidden p-0 transition-all hover:-translate-y-0.5"
                style={{ borderColor: `${m.accent}26` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${m.accent}88, transparent)` }}
                />
                <div className="flex items-start gap-3 px-5 pt-5">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105"
                    style={{ background: m.accentSoft, color: m.accent }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14.5px] font-semibold text-ink-50">{m.name}</h3>
                      {locked && <Lock size={11} className="text-ink-500" />}
                    </div>
                    <p className="truncate text-[11.5px]" style={{ color: m.accent }}>
                      {m.tagline}
                    </p>
                  </div>
                  <ArrowUpRight
                    size={15}
                    className="shrink-0 text-ink-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-200"
                  />
                </div>

                <div className="flex items-end justify-between gap-3 px-5 pt-4">
                  <div>
                    <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">
                      {m.metricLabel}
                    </div>
                    <div className="mono mt-1 flex items-baseline gap-2">
                      <span className="text-[26px] font-bold leading-none" style={{ color: met.color }}>
                        {met.value}
                      </span>
                      {typeof met.trend === "number" && <TrendPill value={met.trend} />}
                    </div>
                  </div>
                  {met.spark && (
                    <div className="h-9 w-[110px] shrink-0 opacity-80">
                      <Sparkline data={met.spark} color={met.color} height={36} />
                    </div>
                  )}
                </div>

                <p className="px-5 pb-5 pt-2 text-[11.5px] text-ink-400">{met.sub}</p>

                <div
                  className="h-0.5 w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
                  style={{ background: m.accent }}
                />
              </Link>
            );
          })}

          {/* ChatOS card */}
          <Link
            href="/chat"
            className="card group relative overflow-hidden bg-gradient-to-br from-brand-500/[0.08] to-purple-500/[0.06] p-5 transition-all hover:-translate-y-0.5"
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-400 transition-transform group-hover:scale-105">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14.5px] font-semibold text-ink-50">ChatOS</h3>
                <p className="text-[11.5px] text-brand-400">The agent layer</p>
              </div>
              <ArrowUpRight
                size={15}
                className="shrink-0 text-ink-600 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-ink-200"
              />
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">
                Tools available
              </div>
              <div className="mono mt-1 text-[26px] font-bold leading-none text-brand-400">14</div>
            </div>
            <p className="mt-2 text-[11.5px] text-ink-400">
              Across all 7 modules · also served over MCP
            </p>
          </Link>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-3.5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Next rungs"
            subtitle="Your own pre-committed exits"
            accent="#a855f7"
            action={
              <Link href="/ladder" className="text-[11.5px] text-ink-400 hover:text-ink-100">
                Open →
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {ladder && ladder.rungs.length ? (
              <div className="space-y-2">
                {[...ladder.rungs]
                  .filter((r) => !r.isHit && r.status !== "executed" && r.status !== "skipped")
                  .sort((a, b) => a.distancePct - b.distancePct)
                  .slice(0, 4)
                  .map((r) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <Badge tone="neutral">{r.symbol}</Badge>
                      <span className="mono text-[12.5px] text-ink-100">
                        {fmtUsd(r.triggerPrice, { dp: r.triggerPrice < 10 ? 2 : 0 })}
                      </span>
                      <span className="mono ml-auto text-[11.5px] text-ink-400">
                        +{r.distancePct.toFixed(1)}% away
                      </span>
                      <span className="mono text-[11.5px] text-purple-400">−{r.sellPct}%</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="py-4 text-[12px] text-ink-500">
                No armed rungs. Open Ladder to define your exits.
              </p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Accountability"
            subtitle="Top-ranked by calibration"
            accent="#eab308"
            action={
              <Link href="/verdict" className="text-[11.5px] text-ink-400 hover:text-ink-100">
                Open →
              </Link>
            }
          />
          <div className="space-y-2 px-5 pb-5">
            {board.slice(0, 4).map((r) => (
              <div key={r.kol.id} className="flex items-center gap-2.5">
                <span className="mono w-4 text-[11px] text-ink-500">{r.rank}</span>
                <span className="truncate text-[12.5px] text-ink-200">{r.kol.name}</span>
                <span className="mono ml-auto text-[11.5px] text-ink-400">
                  {r.resolved ? `${r.accuracy}%` : "—"}
                </span>
                <Badge
                  tone={
                    r.grade === "—" ? "neutral"
                      : r.grade === "A" || r.grade === "B" ? "pos"
                      : r.grade === "C" ? "warn"
                      : "neg"
                  }
                >
                  {r.grade}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Upcoming catalysts"
            subtitle="Impact-weighted"
            accent="#14b8a6"
            action={
              <Link href="/catalyst" className="text-[11.5px] text-ink-400 hover:text-ink-100">
                Open →
              </Link>
            }
          />
          <div className="space-y-2.5 px-5 pb-5">
            {catalysts.events.filter((e) => e.daysAway >= 0).slice(0, 4).map((e) => (
              <div key={e.id} className="flex items-start gap-2.5">
                <span className="mono mt-0.5 w-9 shrink-0 text-[11px] text-ink-500">
                  {e.daysAway}d
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] text-ink-200">{e.title}</div>
                  <div className="text-[10.5px] uppercase tracking-wider text-ink-500">
                    {e.impact} · {e.direction}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 11) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
