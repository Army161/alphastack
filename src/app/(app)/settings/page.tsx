import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Check, ExternalLink, ShieldAlert, User } from "lucide-react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getCurrentUser, getSessionUserId } from "@/lib/auth/session";
import { PLAN_BY_ID } from "@/lib/billing/plans";
import { ALLOCATION_PROFILES } from "@/lib/modules/ladder";
import { hasLlm } from "@/lib/agent/runtime";
import { liveEnabled, getLive } from "@/lib/data/live";
import { PROVIDERS } from "@/lib/data/providers/types";
import { UNIVERSE } from "@/lib/data/market";
import { Badge, Button, Card, CardHeader, Input, Select } from "@/components/ui/primitives";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

async function updateProfile(fd: FormData) {
  "use server";
  const userId = await getSessionUserId();
  if (!userId) return;
  const name = String(fd.get("name") ?? "").slice(0, 80) || null;
  const riskProfile = String(fd.get("riskProfile") ?? "balanced");
  await db
    .update(users)
    .set({
      name,
      riskProfile: ["conservative", "balanced", "aggressive"].includes(riskProfile)
        ? riskProfile
        : "balanced",
    })
    .where(eq(users.id, userId));
  revalidatePath("/settings");
  revalidatePath("/launchpad");
}

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;
  const plan = PLAN_BY_ID[user.plan as keyof typeof PLAN_BY_ID] ?? PLAN_BY_ID.free;
  const llm = hasLlm();
  const live = liveEnabled();
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const snapshot = await getLive().catch(() => null);
  const livePricedCount = snapshot ? Object.keys(snapshot.quotes).length : 0;

  return (
    <div className="mx-auto max-w-[860px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">Settings</h1>
        <p className="mt-1 text-[13px] text-ink-400">Profile, plan and platform configuration.</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader title="Profile" accent="#2dd4bf" />
          <form action={updateProfile} className="space-y-4 px-5 pb-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-300">Name</label>
                <Input name="name" defaultValue={user.name ?? ""} placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-ink-300">Email</label>
                <Input value={user.email} disabled className="opacity-60" />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-ink-300">
                Risk profile
              </label>
              <Select name="riskProfile" defaultValue={user.riskProfile} className="w-full">
                {Object.entries(ALLOCATION_PROFILES).map(([id, p]) => (
                  <option key={id} value={id}>
                    {id.charAt(0).toUpperCase() + id.slice(1)} — {p.core}% core, ±{p.band}pp band
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[11.5px] text-ink-500">
                Drives the Ladder module&rsquo;s drift bands and rebalance sizing.
              </p>
            </div>
            <Button type="submit"><Check size={13} /> Save changes</Button>
          </form>
        </Card>

        <Card>
          <CardHeader
            title="Plan"
            accent="#a855f7"
            action={
              <Link href="/pricing">
                <Button size="sm" variant="secondary">Manage plan</Button>
              </Link>
            }
          />
          <div className="px-5 pb-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/12 text-purple-400">
                <User size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink-50">{plan.name}</span>
                  <Badge tone={user.plan === "free" ? "neutral" : "brand"}>
                    ${plan.price}/mo
                  </Badge>
                </div>
                <p className="text-[12px] text-ink-400">{plan.blurb}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.entries(plan.limits).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-lg border border-ink-700/60 px-3 py-2"
                >
                  <span className="text-[11.5px] text-ink-400">
                    {k.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                  <span className="mono text-[11.5px] text-ink-100">
                    {v === -1 ? "unlimited" : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Data providers"
            subtitle={`${livePricedCount} of ${UNIVERSE.length} assets priced live · every provider degrades independently`}
            accent="#22c55e"
            action={
              <Link
                href="/api/health"
                className="text-[11.5px] text-ink-400 hover:text-ink-100"
              >
                /api/health →
              </Link>
            }
          />
          <div className="space-y-2 px-5 pb-5">
            {Object.values(PROVIDERS).map((p) => {
              const configured = p.keyless || Boolean(p.envKey && process.env[p.envKey]);
              return (
                <div
                  key={p.id}
                  className="flex items-start gap-3 rounded-lg border border-ink-700/60 bg-ink-850/30 px-3.5 py-3"
                >
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      configured ? "bg-green-500" : "bg-ink-600"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12.5px] font-medium text-ink-100">{p.label}</span>
                      <Badge tone={p.keyless ? "pos" : configured ? "brand" : "neutral"}>
                        {p.keyless ? "keyless" : configured ? "key set" : "optional"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[11.5px] text-ink-400">{p.supplies.join(" · ")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Platform configuration"
            subtitle="What is wired up in this deployment"
            accent="#38bdf8"
          />
          <div className="space-y-2 px-5 pb-5">
            <ConfigRow
              label="Agent synthesis (ANTHROPIC_API_KEY)"
              on={llm}
              onText="Full natural-language synthesis across modules"
              offText="Local reasoning mode — intent routed to real engines, no LLM required"
            />
            <ConfigRow
              label="Live market data"
              on={live}
              onText={`Live — ${livePricedCount} assets priced from CoinGecko, derivatives from OKX/Hyperliquid, rates from FRED`}
              offText="Pinned to the deterministic model (ENABLE_LIVE_DATA=0)"
            />
            <ConfigRow
              label="Stripe billing (STRIPE_SECRET_KEY)"
              on={stripe}
              onText="Live checkout and subscription webhooks active"
              offText="Local evaluation mode — upgrades grant the plan directly without payment"
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Disclosure" accent="#f59e0b" />
          <div className="flex items-start gap-2.5 px-5 pb-5">
            <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-400" />
            <p className="text-[12px] leading-relaxed text-ink-400">
              AlphaStack is an analysis and research tool. It does not provide financial, investment
              or trading advice, and nothing it outputs is a recommendation to buy or sell any asset.
              The Ladder module is a rules engine that executes only the rules you define yourself;
              it never places orders and is not connected to any exchange. Model outputs are
              probabilistic and can be wrong.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Session" accent="#ef4444" />
          <div className="flex items-center gap-3 px-5 pb-5">
            <form action="/api/auth/signout" method="post">
              <Button variant="danger" type="submit">Sign out</Button>
            </form>
            <Link
              href="/api/v1/tools"
              className="flex items-center gap-1.5 text-[12px] text-ink-400 hover:text-ink-100"
            >
              View tool catalogue <ExternalLink size={11} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function ConfigRow({
  label, on, onText, offText,
}: { label: string; on: boolean; onText: string; offText: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-ink-700/60 bg-ink-850/30 px-3.5 py-3">
      <span
        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${on ? "bg-green-500" : "bg-ink-600"}`}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="mono text-[12px] text-ink-100">{label}</span>
          <Badge tone={on ? "pos" : "neutral"}>{on ? "active" : "not set"}</Badge>
        </div>
        <p className="mt-1 text-[11.5px] leading-relaxed text-ink-400">{on ? onText : offText}</p>
      </div>
    </div>
  );
}
