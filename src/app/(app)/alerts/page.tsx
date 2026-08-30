import { revalidatePath } from "next/cache";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { AlertTriangle, Bell, CheckCheck, Info, Zap } from "lucide-react";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentUser, getSessionUserId } from "@/lib/auth/session";
import { MODULE_BY_ID, MODULES } from "@/lib/modules/registry";
import { computeRadar } from "@/lib/modules/radar";
import { computeExhaustion } from "@/lib/modules/exhaustion";
import { computeCatalysts } from "@/lib/modules/catalyst";
import { Badge, Button, Card, CardHeader, EmptyState, Stat } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Alerts" };
export const dynamic = "force-dynamic";

async function markAllRead() {
  "use server";
  const userId = await getSessionUserId();
  if (!userId) return;
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  revalidatePath("/alerts");
  revalidatePath("/launchpad");
}

export default async function AlertsPage() {
  const user = (await getCurrentUser())!;
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(60);

  const unread = rows.filter((r) => !r.readAt).length;

  // Live conditions currently satisfying an alert rule.
  const [radar, ses, cat] = await Promise.all([
    computeRadar("BTC"),
    computeExhaustion("BTC"),
    computeCatalysts(),
  ]);

  type LiveAlert = {
    moduleId: string;
    severity: "info" | "warn" | "critical";
    title: string;
    body: string;
  };

  const live: LiveAlert[] = [
    ...radar.triggers
      .filter((t) => t.fired)
      .map((t): LiveAlert => ({
        moduleId: "radar",
        severity: t.severity,
        title: t.label,
        body: t.detail,
      })),
    ...(ses.override.active
      ? ([{
          moduleId: "exhaustion",
          severity: ses.override.adjustment > 0 ? "info" : "warn",
          title: ses.override.label,
          body: ses.override.detail,
        }] as LiveAlert[])
      : []),
    ...(cat.next && cat.next.daysAway <= 14
      ? ([{
          moduleId: "catalyst",
          severity: cat.next.impact === "extreme" ? "warn" : "info",
          title: `${cat.next.title} in ${cat.next.daysAway} days`,
          body: cat.next.watchFor,
        }] as LiveAlert[])
      : []),
    ...(cat.macro.pivotDetected
      ? ([{
          moduleId: "ladder",
          severity: "critical",
          title: "Fed pivot detected — macro regime flag",
          body: cat.macro.detail,
        }] as LiveAlert[])
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-50">Alerts</h1>
          <p className="mt-1 text-[13px] text-ink-400">
            Live conditions across every module, plus your notification history.
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <Button size="md" variant="secondary" type="submit">
              <CheckCheck size={14} /> Mark all read ({unread})
            </Button>
          </form>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><Stat label="Firing now" value={live.length} accent={live.length ? "#ef4444" : "#22c55e"} sub="Conditions currently met" /></Card>
        <Card><Stat label="Unread" value={unread} accent="#f59e0b" sub="In your notification feed" /></Card>
        <Card><Stat label="Total history" value={rows.length} sub="Last 60 events" /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Firing now"
              subtitle="Live rule evaluations against current module state"
              accent="#ef4444"
            />
            <div className="space-y-2 px-5 pb-5">
              {live.length === 0 ? (
                <p className="py-4 text-[12.5px] text-green-400">
                  No alert conditions are currently met across any module.
                </p>
              ) : (
                live.map((a, i) => {
                  const m = MODULE_BY_ID[a.moduleId];
                  return (
                    <Link
                      key={i}
                      href={m?.slug ?? "/launchpad"}
                      className="block rounded-xl border p-3.5 transition-colors hover:bg-ink-850/50"
                      style={{
                        borderColor:
                          a.severity === "critical"
                            ? "rgba(239,68,68,0.3)"
                            : a.severity === "warn"
                              ? "rgba(245,158,11,0.3)"
                              : "rgba(90,103,133,0.22)",
                        background:
                          a.severity === "critical"
                            ? "rgba(239,68,68,0.05)"
                            : a.severity === "warn"
                              ? "rgba(245,158,11,0.04)"
                              : undefined,
                      }}
                    >
                      <div className="flex items-start gap-2.5">
                        <SeverityIcon severity={a.severity} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-medium text-ink-50">{a.title}</span>
                            {m && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
                                style={{ background: m.accentSoft, color: m.accent }}
                              >
                                {m.name}
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{a.body}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="History" subtitle="Your notification feed" accent="#8290ad" />
            <div className="space-y-2 px-5 pb-5">
              {rows.length === 0 ? (
                <EmptyState
                  title="No notifications yet"
                  body="Alerts you arm inside any module will appear here, along with regime changes and triggered rungs."
                />
              ) : (
                rows.map((n) => {
                  const m = MODULE_BY_ID[n.moduleId];
                  return (
                    <div
                      key={n.id}
                      className={`rounded-xl border border-ink-700/60 p-3.5 ${n.readAt ? "opacity-60" : "bg-ink-850/40"}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <SeverityIcon severity={n.severity as "info" | "warn" | "critical"} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px] font-medium text-ink-50">{n.title}</span>
                            {m && (
                              <span
                                className="rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
                                style={{ background: m.accentSoft, color: m.accent }}
                              >
                                {m.name}
                              </span>
                            )}
                            {!n.readAt && <Badge tone="brand">new</Badge>}
                            <span className="mono ml-auto text-[10.5px] text-ink-500">
                              {timeAgo(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-ink-400">{n.body}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Alert coverage" subtitle="What each module can notify on" accent="#2dd4bf" />
          <div className="space-y-2.5 px-5 pb-5">
            {MODULES.map((m) => (
              <Link
                key={m.id}
                href={m.slug}
                className="flex items-center gap-2.5 rounded-lg border border-ink-700/60 px-3 py-2 transition-colors hover:bg-ink-850/60"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: m.accent }} />
                <span className="text-[12px] text-ink-200">{m.name}</span>
                <Bell size={11} className="ml-auto text-ink-600" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "info" | "warn" | "critical" }) {
  if (severity === "critical")
    return <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />;
  if (severity === "warn") return <Zap size={14} className="mt-0.5 shrink-0 text-amber-400" />;
  return <Info size={14} className="mt-0.5 shrink-0 text-sky-400" />;
}
