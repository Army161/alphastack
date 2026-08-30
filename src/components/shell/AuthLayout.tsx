import Link from "next/link";
import { Zap, Check } from "lucide-react";
import { computeExhaustion } from "@/lib/modules/exhaustion";
import { computeRadar } from "@/lib/modules/radar";

export async function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [ses, radar] = await Promise.all([computeExhaustion("BTC"), computeRadar("BTC")]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      {/* Form side */}
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Zap size={16} className="text-ink-950" strokeWidth={2.5} />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-ink-50">AlphaStack</span>
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">{title}</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-400">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer}
        </div>

        <p className="text-[11px] text-ink-600">
          Analysis tool. Not financial advice.
        </p>
      </div>

      {/* Showcase side */}
      <div className="relative hidden overflow-hidden border-l border-ink-700/40 bg-ink-850/40 lg:block">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-center px-12">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-ink-50">
              Every number in the workspace traces back to a tool call.
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-400">
              Seven engines. One agent. No figure the platform cannot show you the source of.
            </p>

            <div className="mt-8 space-y-3">
              <ShowcaseCard
                label="Exhaustion · SES"
                value={ses.score.toFixed(1)}
                sub={`${ses.regime} — ${ses.factors.filter((f) => f.direction === "bullish").length}/6 factors bullish`}
                color="#22c55e"
              />
              <ShowcaseCard
                label="Radar · Crowding"
                value={radar.crowdingIndex.toFixed(1)}
                sub={`${radar.crowdingLabel} — ${radar.triggers.filter((t) => t.fired).length} triggers fired`}
                color="#ef4444"
              />
            </div>

            <ul className="mt-8 space-y-2.5">
              {[
                "All 7 modules on the free tier",
                "Agent with live tool access",
                "MCP server for Claude Desktop & Code",
                "No card required to start",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[13px] text-ink-300">
                  <span className="grid h-4.5 w-4.5 shrink-0 place-items-center rounded-md bg-brand-500/15 text-brand-400">
                    <Check size={10} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcaseCard({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="card flex items-center gap-4 px-4 py-3.5">
      <div
        className="mono grid h-14 w-14 shrink-0 place-items-center rounded-xl text-lg font-bold"
        style={{ background: `${color}18`, color }}
      >
        {value}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-500">{label}</div>
        <div className="mt-0.5 text-[12.5px] text-ink-200">{sub}</div>
      </div>
    </div>
  );
}
