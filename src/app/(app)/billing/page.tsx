import Link from "next/link";
import { Check, CreditCard, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { PLANS, PLAN_BY_ID } from "@/lib/billing/plans";
import { Badge, Button, Card, CardHeader, Stat } from "@/components/ui/primitives";

export const metadata = { title: "Billing" };
export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgraded?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const user = (await getCurrentUser())!;
  const plan = PLAN_BY_ID[user.plan as keyof typeof PLAN_BY_ID] ?? PLAN_BY_ID.free;

  return (
    <div className="mx-auto max-w-[980px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">Billing</h1>
        <p className="mt-1 text-[13px] text-ink-400">Your plan, limits and upgrade options.</p>
      </div>

      {params.upgraded && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-green-500/30 bg-green-500/[0.07] px-4 py-3.5">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-green-400" />
          <div>
            <div className="text-[13px] font-semibold text-green-400">
              You are on the {plan.name} plan
            </div>
            <p className="mt-0.5 text-[12px] text-ink-300">
              {params.mode === "local"
                ? "Granted in local evaluation mode — no payment was taken because Stripe keys are not configured in this deployment."
                : "Payment confirmed. Every gated feature is now unlocked."}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <Stat label="Current plan" value={plan.name} accent="#a855f7" sub={`$${plan.price}/month`} />
        </Card>
        <Card>
          <Stat
            label="Agent messages"
            value={plan.limits.agentMessagesPerDay === -1 ? "∞" : plan.limits.agentMessagesPerDay}
            sub="Per day"
          />
        </Card>
        <Card>
          <Stat
            label="History window"
            value={plan.limits.history}
            sub="Data retention on charts and exports"
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => {
          const current = p.id === user.plan;
          return (
            <Card
              key={p.id}
              className={`relative p-6 ${p.highlight && !current ? "border-brand-500/40 ring-1 ring-brand-500/20" : ""}`}
            >
              {current && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-ink-700 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-100">
                  Current
                </span>
              )}
              {p.highlight && !current && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-brand-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-950">
                  Most popular
                </span>
              )}
              <h3 className="text-[15px] font-semibold text-ink-50">{p.name}</h3>
              <div className="mono mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-ink-50">${p.price}</span>
                <span className="text-[12px] text-ink-500">/mo</span>
              </div>
              {p.priceAnnual > 0 && (
                <div className="mt-1 text-[11px] text-ink-500">
                  or ${p.priceAnnual}/yr — two months free
                </div>
              )}
              <p className="mt-3 min-h-[3.4rem] text-[12.5px] leading-relaxed text-ink-400">
                {p.blurb}
              </p>

              {current ? (
                <Button className="mt-4 w-full" variant="secondary" disabled>
                  Your plan
                </Button>
              ) : p.id === "free" ? (
                <Button className="mt-4 w-full" variant="ghost" disabled>
                  Downgrade in settings
                </Button>
              ) : (
                <form action="/api/stripe/checkout" method="post" className="mt-4">
                  <input type="hidden" name="plan" value={p.id} />
                  <input type="hidden" name="interval" value="monthly" />
                  <Button
                    type="submit"
                    className="w-full"
                    variant={p.highlight ? "primary" : "secondary"}
                  >
                    <CreditCard size={13} /> {p.cta}
                  </Button>
                </form>
              )}

              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-ink-400">
                    <Check size={12} className="mt-0.5 shrink-0 text-brand-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <CardHeader title="How monetisation is wired" accent="#2dd4bf" />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          {[
            ["Freemium gate", "Every module is visible on the free tier but throttled — delayed scores, top-5 universe, 3 scans/month. The free tier proves the models work; the paid tier makes them actionable."],
            ["Usage metering", "Agent messages, scans and alerts are metered per plan and enforced server-side against the plan limits table."],
            ["API + MCP as a tier", "Programmatic access is an Operator feature and a Desk volume product — the same tool surface, sold by seat and by call volume."],
            ["Public funnel", "The KOL leaderboard is deliberately public and free. It is a shareable asset with near-zero marginal cost that feeds signups into the gated modules."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-ink-700/60 bg-ink-850/30 p-3.5">
              <div className="text-[12.5px] font-medium text-ink-100">{t}</div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{d}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="mt-4 text-center text-[11.5px] text-ink-500">
        Questions about Desk or volume pricing?{" "}
        <Link href="/pricing" className="text-brand-400 hover:text-brand-300">
          Compare plans
        </Link>
      </p>
    </div>
  );
}
