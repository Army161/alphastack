import Link from "next/link";
import {
  Zap, ArrowRight, Gauge, Radar, Terminal, TrendingUp, Shield, Scale,
  Calendar, Check, Sparkles, Code2, Lock, Activity,
} from "lucide-react";
import { MODULES } from "@/lib/modules/registry";
import { PLANS } from "@/lib/billing/plans";
import { Badge, Button } from "@/components/ui/primitives";
import { computeExhaustion } from "@/lib/modules/exhaustion";
import { computeRadar } from "@/lib/modules/radar";
import { marketOverview } from "@/lib/modules/terminal";
import { fmtUsd } from "@/lib/utils";
import { signInDemo } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

const ICONS: Record<string, React.ElementType> = {
  gauge: Gauge, radar: Radar, terminal: Terminal, ladder: TrendingUp,
  shield: Shield, scale: Scale, calendar: Calendar,
};

export default async function LandingPage() {
  const user = await getCurrentUser().catch(() => null);
  const [ses, radar, overview] = await Promise.all([
    computeExhaustion("BTC"),
    computeRadar("BTC"),
    marketOverview(),
  ]);

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-ink-700/40 bg-ink-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-6xl items-center gap-3 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Zap size={16} className="text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-ink-50">AlphaStack</span>
          </Link>
          <nav className="ml-6 hidden items-center gap-5 md:flex">
            <a href="#modules" className="text-[13px] text-ink-400 transition-colors hover:text-ink-100">Modules</a>
            <a href="#agent" className="text-[13px] text-ink-400 transition-colors hover:text-ink-100">Agent</a>
            <a href="#developers" className="text-[13px] text-ink-400 transition-colors hover:text-ink-100">Developers</a>
            <Link href="/pricing" className="text-[13px] text-ink-400 transition-colors hover:text-ink-100">Pricing</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link href="/launchpad"><Button size="sm">Open workspace <ArrowRight size={13} /></Button></Link>
            ) : (
              <>
                <Link href="/signin"><Button size="sm" variant="ghost">Sign in</Button></Link>
                <Link href="/signup"><Button size="sm">Start free</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="grid-bg relative overflow-hidden border-b border-ink-700/40">
        <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
          <Badge tone="brand" dot>Seven modules · one agent · live</Badge>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight text-ink-50 md:text-6xl">
            Crypto intelligence that
            <span className="bg-gradient-to-r from-brand-400 to-purple-400 bg-clip-text text-transparent"> shows its work</span>.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-300">
            Capitulation scoring, leverage crowding, thesis screening, exit discipline, contract
            security, prediction accountability and catalyst tracking — each a real engine, all
            driveable by one agent that never answers from memory.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/signup"><Button size="lg">Start free <ArrowRight size={15} /></Button></Link>
            <form action={signInDemo}>
              <Button size="lg" variant="outline" type="submit">
                <Sparkles size={15} /> Try the live demo
              </Button>
            </form>
          </div>
          <p className="mt-3 text-[12px] text-ink-500">
            Demo account is pre-loaded with a portfolio, exit ladder and alert history. No card required.
          </p>

          {/* Live strip */}
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LiveTile
              label="Seller Exhaustion"
              value={ses.score.toFixed(1)}
              sub={`${ses.regime} regime`}
              color="#22c55e"
            />
            <LiveTile
              label="Leverage crowding"
              value={radar.crowdingIndex.toFixed(1)}
              sub={radar.crowdingLabel}
              color="#ef4444"
            />
            <LiveTile
              label="BTC dominance"
              value={`${overview.btcDominance}%`}
              sub={`${overview.qualifiers} assets pass thesis filter`}
              color="#38bdf8"
            />
            <LiveTile
              label="24h liquidations"
              value={fmtUsd(radar.liq24h, { compact: true })}
              sub={`${radar.dominantSide === "long" ? "Longs" : "Shorts"} dominant`}
              color="#a855f7"
            />
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="modules" className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-10 max-w-2xl">
          <Badge>The stack</Badge>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-50">
            Seven products. One workspace.
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-300">
            Each module is a standalone product with its own dashboard, controls and alerts.
            The Launchpad is the portfolio view — click any card and you are inside the product.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon] ?? Activity;
            return (
              <Link
                key={m.id}
                href={m.slug}
                className="card group relative p-5 transition-all hover:-translate-y-0.5"
                style={{ borderColor: `${m.accent}22` }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-px opacity-60"
                  style={{ background: `linear-gradient(90deg, transparent, ${m.accent}, transparent)` }}
                />
                <div className="flex items-start gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ background: m.accentSoft, color: m.accent }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold text-ink-50">{m.name}</h3>
                    <p className="text-[11.5px] font-medium" style={{ color: m.accent }}>
                      {m.tagline}
                    </p>
                  </div>
                  <ArrowRight
                    size={15}
                    className="ml-auto shrink-0 text-ink-600 transition-all group-hover:translate-x-0.5 group-hover:text-ink-300"
                  />
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">{m.description}</p>
                <ul className="mt-3.5 space-y-1.5">
                  {m.features.slice(0, 3).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[11.5px] text-ink-400">
                      <Check size={12} className="mt-0.5 shrink-0" style={{ color: m.accent }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </Link>
            );
          })}

          <Link
            href="/chat"
            className="card group relative flex flex-col justify-between bg-gradient-to-br from-brand-500/10 to-purple-500/10 p-5 transition-all hover:-translate-y-0.5"
          >
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/15 text-brand-400">
                <Sparkles size={18} />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-ink-50">ChatOS</h3>
              <p className="text-[11.5px] font-medium text-brand-400">The agent layer</p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-400">
                One conversation with tool access to every module. Ask a cross-module question and
                it calls four engines and synthesises the answer — with the tool calls shown inline.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-brand-400">
              Open ChatOS <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* Agent section */}
      <section id="agent" className="border-y border-ink-700/40 bg-ink-850/30">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-2">
          <div>
            <Badge tone="brand">Agent-first</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-50">
              Every number traceable to a tool call.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-300">
              The agent has 14 typed tools over a fixed semantic layer — never free-form SQL. It
              cannot hallucinate a price, because it has to call <code className="rounded bg-ink-800 px-1.5 py-0.5 text-[12px] text-brand-400">get_quote</code> to
              know one. Tool executions render inline so you can see exactly which engine produced
              which figure.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ["Cross-module synthesis", "Ask one question, it calls Exhaustion, Radar and Catalyst and reconciles them."],
                ["Disconfirming evidence surfaced", "If the bottom signal is bullish but leverage is extreme, it says both."],
                ["Works without an API key", "Local reasoning mode routes intent and executes the real engines."],
                ["Same tools over MCP", "Point Claude Desktop or Claude Code at the MCP endpoint and get the identical surface."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <div className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-500/15 text-brand-400">
                    <Check size={11} />
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-ink-100">{t}</div>
                    <div className="text-[12px] text-ink-400">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-ink-700/50 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              <span className="mono ml-2 text-[10.5px] text-ink-500">chatos · agent session</span>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex justify-end">
                <div className="rounded-2xl rounded-br-md bg-ink-750 px-3.5 py-2.5 text-[12.5px] text-ink-100">
                  Is the bottom in, and is leverage a problem right now?
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
                  <Sparkles size={11} className="text-ink-950" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <ToolChip name="get_exhaustion_score" color="#22c55e" />
                    <ToolChip name="get_leverage_radar" color="#ef4444" />
                    <ToolChip name="get_catalysts" color="#14b8a6" />
                  </div>
                  <div className="space-y-2 text-[12.5px] leading-relaxed text-ink-300">
                    <p>
                      <strong className="text-ink-50">Two different answers, and that is the point.</strong>
                    </p>
                    <p>
                      Exhaustion prints <strong className="text-ink-50">{ses.score.toFixed(1)}</strong> —{" "}
                      {ses.regime} regime. {ses.factors.filter((f) => f.direction === "bullish").length} of 6
                      factors are bullish.
                    </p>
                    <p>
                      But Radar has crowding at <strong className="text-ink-50">{radar.crowdingIndex.toFixed(1)}</strong> ({radar.crowdingLabel}),
                      with {radar.dominantSide}s dominant and {fmtUsd(radar.liq24h, { compact: true })} liquidated in 24h.
                    </p>
                    <p className="text-ink-400">
                      Structural picture is improving; positioning is fragile. Those resolve on
                      different timescales.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developers */}
      <section id="developers" className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Badge tone="info">Developers</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-50">
              The whole platform is an API.
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-300">
              Every module engine is exposed three ways from one definition: the in-app agent, a
              REST endpoint, and a Model Context Protocol server. Wire AlphaStack into Claude
              Desktop, Claude Code, or your own agent in one line of config.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="card px-4 py-3">
                <div className="mono text-[11px] text-ink-500">TOOLS</div>
                <div className="mono mt-0.5 text-xl font-semibold text-ink-50">14</div>
              </div>
              <div className="card px-4 py-3">
                <div className="mono text-[11px] text-ink-500">PROTOCOLS</div>
                <div className="mono mt-0.5 text-xl font-semibold text-ink-50">REST · MCP</div>
              </div>
              <div className="card px-4 py-3">
                <div className="mono text-[11px] text-ink-500">FREE-FORM SQL</div>
                <div className="mono mt-0.5 text-xl font-semibold text-ink-50">None</div>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-ink-700/50 px-4 py-2.5">
              <Code2 size={13} className="text-ink-500" />
              <span className="mono text-[10.5px] text-ink-500">claude_desktop_config.json</span>
            </div>
            <pre className="mono overflow-x-auto p-4 text-[11.5px] leading-relaxed text-ink-300">
{`{
  "mcpServers": {
    "alphastack": {
      "command": "npx",
      "args": ["-y", "alphastack-mcp"],
      "env": {
        "ALPHASTACK_URL": "http://localhost:3000",
        "ALPHASTACK_KEY": "ask_live_..."
      }
    }
  }
}`}
            </pre>
            <div className="border-t border-ink-700/50 px-4 py-3">
              <div className="mono text-[10.5px] text-ink-500">OR CURL IT DIRECTLY</div>
              <pre className="mono mt-1.5 overflow-x-auto text-[11px] text-brand-400">
{`curl -X POST localhost:3000/api/v1/tools \\
  -H "Authorization: Bearer ask_live_..." \\
  -d '{"tool":"get_exhaustion_score","input":{"asset":"BTC"}}'`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-ink-700/40 bg-ink-850/30">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-10 text-center">
            <Badge>Pricing</Badge>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink-50">
              Free tier proves the models. Paid tier makes them actionable.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`card relative p-6 ${p.highlight ? "border-brand-500/40 ring-1 ring-brand-500/20" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                    Most popular
                  </span>
                )}
                <h3 className="text-[15px] font-semibold text-ink-50">{p.name}</h3>
                <div className="mono mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-ink-50">${p.price}</span>
                  <span className="text-[12px] text-ink-500">/mo</span>
                </div>
                <p className="mt-3 min-h-[3rem] text-[12.5px] leading-relaxed text-ink-400">{p.blurb}</p>
                <Link href={p.id === "free" ? "/signup" : "/pricing"} className="mt-4 block">
                  <Button className="w-full" variant={p.highlight ? "primary" : "secondary"}>
                    {p.cta}
                  </Button>
                </Link>
                <ul className="mt-5 space-y-2">
                  {p.features.slice(0, 6).map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-ink-400">
                      <Check size={12} className="mt-0.5 shrink-0 text-brand-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ink-700/40">
        <div className="mx-auto max-w-6xl px-5 py-10">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
                <Zap size={14} className="text-ink-950" strokeWidth={2.5} />
              </div>
              <span className="text-[14px] font-bold text-ink-50">AlphaStack</span>
            </div>
            <nav className="flex flex-wrap gap-5 text-[12.5px] text-ink-400">
              <Link href="/pricing" className="hover:text-ink-100">Pricing</Link>
              <Link href="/signin" className="hover:text-ink-100">Sign in</Link>
              <Link href="/developers" className="hover:text-ink-100">API</Link>
              <a href="/api/v1/tools" className="hover:text-ink-100">Tool catalogue</a>
              <a href="/api/mcp" className="hover:text-ink-100">MCP endpoint</a>
            </nav>
          </div>
          <div className="mt-6 flex items-start gap-2 rounded-lg border border-ink-700/50 bg-ink-850/40 px-4 py-3">
            <Lock size={13} className="mt-0.5 shrink-0 text-ink-500" />
            <p className="text-[11.5px] leading-relaxed text-ink-500">
              AlphaStack is an analysis and research tool. It does not provide financial, investment
              or trading advice, and nothing in it is a recommendation to buy or sell any asset. The
              Ladder module executes only rules you define yourself. In local mode, market series are
              deterministically modelled for demonstration — connect a live data provider before
              relying on any figure.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function LiveTile({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">{label}</span>
      </div>
      <div className="mono mt-1.5 text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-400">{sub}</div>
    </div>
  );
}

function ToolChip({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="mono inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px]"
      style={{ borderColor: `${color}44`, background: `${color}11`, color }}
    >
      <Check size={8} /> {name}
    </span>
  );
}
