import Link from "next/link";
import { ArrowLeft, Check, Minus, Zap } from "lucide-react";
import { PLANS } from "@/lib/billing/plans";
import { MODULES } from "@/lib/modules/registry";
import { getCurrentUser } from "@/lib/auth/session";
import { Badge, Button, Card } from "@/components/ui/primitives";

export const metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const MATRIX: { feature: string; free: string | boolean; pro: string | boolean; desk: string | boolean }[] = [
  { feature: "All 7 modules", free: true, pro: true, desk: true },
  { feature: "Exhaustion score", free: "48h delayed", pro: "Live", desk: "Live" },
  { feature: "Factor breakdown + whale override", free: false, pro: true, desk: true },
  { feature: "Liquidation magnet levels", free: false, pro: true, desk: true },
  { feature: "Screener universe", free: "Top 5", pro: "Full", desk: "Full + export" },
  { feature: "Exit rungs", free: "1 asset", pro: "Unlimited", desk: "Unlimited" },
  { feature: "Fed pivot macro override", free: false, pro: true, desk: true },
  { feature: "Contract scans", free: "3 / month", pro: "Unlimited", desk: "Unlimited + CI" },
  { feature: "Transcript call extractor", free: false, pro: true, desk: true },
  { feature: "KOL leaderboard", free: true, pro: "Full history", desk: "Custom lists" },
  { feature: "Catalyst calendar", free: "Next 3", pro: "Full book", desk: "Full + webhooks" },
  { feature: "Agent messages / day", free: "20", pro: "500", desk: "Unlimited" },
  { feature: "API keys", free: false, pro: "2", desk: "25" },
  { feature: "MCP server access", free: false, pro: true, desk: true },
  { feature: "Alert channels", free: "In-app", pro: "In-app, email, webhook", desk: "+ Slack, Discord, Telegram" },
  { feature: "Data history", free: "30 days", pro: "2 years", desk: "Full" },
  { feature: "Seats", free: "1", pro: "1", desk: "5" },
];

export default async function PricingPage() {
  const user = await getCurrentUser().catch(() => null);

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink-700/40 px-5 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
              <Zap size={16} className="text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-ink-50">AlphaStack</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Link href="/launchpad">
                <Button size="sm" variant="secondary">
                  <ArrowLeft size={13} /> Back to workspace
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/signin"><Button size="sm" variant="ghost">Sign in</Button></Link>
                <Link href="/signup"><Button size="sm">Start free</Button></Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="text-center">
          <Badge tone="brand">Pricing</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink-50">
            Prove the models free. Pay to act on them.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-ink-300">
            Every module is visible on the free tier. Paid unlocks live data, the full universe,
            alerts, and programmatic access.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => {
            const current = user?.plan === p.id;
            return (
              <Card
                key={p.id}
                className={`relative p-6 ${p.highlight ? "border-brand-500/40 ring-1 ring-brand-500/20" : ""}`}
              >
                {p.highlight && (
                  <span className="absolute -top-2.5 left-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                    Most popular
                  </span>
                )}
                <h3 className="text-[16px] font-semibold text-ink-50">{p.name}</h3>
                <div className="mono mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-ink-50">${p.price}</span>
                  <span className="text-[13px] text-ink-500">/mo</span>
                </div>
                {p.priceAnnual > 0 && (
                  <div className="mt-1 text-[11.5px] text-ink-500">
                    ${p.priceAnnual}/yr billed annually — two months free
                  </div>
                )}
                <p className="mt-3 min-h-[3.4rem] text-[12.5px] leading-relaxed text-ink-400">
                  {p.blurb}
                </p>

                {current ? (
                  <Button className="mt-5 w-full" variant="secondary" disabled>Current plan</Button>
                ) : p.id === "free" ? (
                  <Link href={user ? "/launchpad" : "/signup"} className="mt-5 block">
                    <Button className="w-full" variant="secondary">{p.cta}</Button>
                  </Link>
                ) : user ? (
                  <form action="/api/stripe/checkout" method="post" className="mt-5">
                    <input type="hidden" name="plan" value={p.id} />
                    <Button type="submit" className="w-full" variant={p.highlight ? "primary" : "secondary"}>
                      {p.cta}
                    </Button>
                  </form>
                ) : (
                  <Link href="/signup" className="mt-5 block">
                    <Button className="w-full" variant={p.highlight ? "primary" : "secondary"}>
                      {p.cta}
                    </Button>
                  </Link>
                )}

                <ul className="mt-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12.5px] text-ink-400">
                      <Check size={12} className="mt-0.5 shrink-0 text-brand-500" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* Matrix */}
        <Card className="mt-10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="border-b border-ink-700/50">
                  <th className="px-5 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-500">
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.id}
                      className="px-4 py-3.5 text-center text-[12.5px] font-semibold text-ink-100"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-ink-800/60 ${i % 2 ? "bg-ink-850/25" : ""}`}
                  >
                    <td className="px-5 py-2.5 text-[12.5px] text-ink-300">{row.feature}</td>
                    {(["free", "pro", "desk"] as const).map((k) => (
                      <td key={k} className="px-4 py-2.5 text-center">
                        <Cell value={row[k]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modules recap */}
        <div className="mt-12">
          <h2 className="text-center text-[13px] font-semibold uppercase tracking-[0.09em] text-ink-400">
            Every plan includes all seven modules
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {MODULES.map((m) => (
              <Link
                key={m.id}
                href={m.slug}
                className="flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] transition-colors hover:bg-ink-850"
                style={{ borderColor: `${m.accent}33`, color: m.accent }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.accent }} />
                {m.name}
              </Link>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-2xl text-center text-[11.5px] leading-relaxed text-ink-500">
          AlphaStack is an analysis tool and does not provide financial or investment advice. Prices
          in USD. Cancel any time. When Stripe keys are not configured, upgrades run in local
          evaluation mode and no payment is taken.
        </p>
      </div>
    </div>
  );
}

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={14} className="mx-auto text-green-400" />;
  if (value === false) return <Minus size={14} className="mx-auto text-ink-600" />;
  return <span className="mono text-[11.5px] text-ink-200">{value}</span>;
}
