import { revalidatePath } from "next/cache";
import { desc, eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { Code2, Key, Plug, Trash2 } from "lucide-react";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { getCurrentUser, getSessionUserId } from "@/lib/auth/session";
import { TOOL_DEFS } from "@/lib/agent/tools";
import { MODULE_BY_ID } from "@/lib/modules/registry";
import { limitFor } from "@/lib/billing/plans";
import { Badge, Button, Card, CardHeader, Input, Stat } from "@/components/ui/primitives";
import { timeAgo } from "@/lib/utils";
import { CopyBlock, RevealOnce } from "./CopyBlock";

export const metadata = { title: "Developers" };
export const dynamic = "force-dynamic";

async function createKey(fd: FormData) {
  "use server";
  const userId = await getSessionUserId();
  if (!userId) return;
  const name = String(fd.get("name") ?? "Untitled key").slice(0, 60);
  const raw = `ask_live_${nanoid(28)}`;
  await db.insert(apiKeys).values({
    id: nanoid(),
    userId,
    name,
    prefix: raw.slice(0, 10),
    hash: await bcrypt.hash(raw, 10),
    createdAt: new Date(),
  });
  revalidatePath("/developers");
  // The raw key is surfaced once via the redirect param below.
  const { redirect } = await import("next/navigation");
  redirect(`/developers?new=${encodeURIComponent(raw)}`);
}

async function revokeKey(fd: FormData) {
  "use server";
  const userId = await getSessionUserId();
  if (!userId) return;
  const id = String(fd.get("id"));
  await db
    .update(apiKeys)
    .set({ revoked: true })
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)));
  revalidatePath("/developers");
}

export default async function DevelopersPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const params = await searchParams;
  const user = (await getCurrentUser())!;
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id))
    .orderBy(desc(apiKeys.createdAt));

  const allowed = limitFor(user.plan, "apiKeys") as number;
  const activeKeys = keys.filter((k) => !k.revoked);

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink-50">Developers</h1>
        <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-400">
          Every module engine is exposed three ways from a single definition: the in-app agent, a
          REST endpoint, and a Model Context Protocol server. No free-form SQL, so every response is
          reproducible.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><Stat label="Tools exposed" value={TOOL_DEFS.length} sub="Identical across REST, MCP and ChatOS" /></Card>
        <Card><Stat label="Active keys" value={`${activeKeys.length}/${allowed === -1 ? "∞" : allowed}`} accent="#38bdf8" sub={`${user.plan === "free" ? "Scout" : user.plan === "pro" ? "Operator" : "Desk"} plan allowance`} /></Card>
        <Card><Stat label="Protocols" value="REST · MCP" sub="JSON-RPC 2.0 over HTTP" /></Card>
      </div>

      {params.new && <RevealOnce value={params.new} />}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="API keys" accent="#38bdf8" />
          <div className="px-5 pb-5">
            {allowed === 0 ? (
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3">
                <p className="text-[12px] leading-relaxed text-ink-300">
                  API keys are an Operator feature. Session-authenticated requests from inside the
                  app work on every plan — try the endpoints below while signed in.
                </p>
              </div>
            ) : (
              <form action={createKey} className="flex gap-2">
                <Input name="name" placeholder="Key name (e.g. claude-desktop)" required />
                <Button type="submit" disabled={allowed !== -1 && activeKeys.length >= allowed}>
                  <Key size={13} /> Create
                </Button>
              </form>
            )}

            <div className="mt-4 space-y-2">
              {keys.length === 0 ? (
                <p className="py-3 text-[12px] text-ink-500">No keys yet.</p>
              ) : (
                keys.map((k) => (
                  <div
                    key={k.id}
                    className={`flex items-center gap-3 rounded-lg border border-ink-700/60 px-3.5 py-2.5 ${k.revoked ? "opacity-45" : ""}`}
                  >
                    <Key size={13} className="shrink-0 text-ink-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[12.5px] text-ink-100">{k.name}</span>
                        {k.revoked && <Badge tone="neg">revoked</Badge>}
                      </div>
                      <div className="mono text-[10.5px] text-ink-500">
                        {k.prefix}••••••••••••••••••• · created {timeAgo(k.createdAt)}
                        {k.lastUsedAt ? ` · used ${timeAgo(k.lastUsedAt)}` : " · never used"}
                      </div>
                    </div>
                    {!k.revoked && (
                      <form action={revokeKey}>
                        <input type="hidden" name="id" value={k.id} />
                        <button
                          type="submit"
                          className="grid h-7 w-7 place-items-center rounded text-ink-600 transition-colors hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Connect an MCP client" accent="#a855f7" />
          <div className="space-y-3 px-5 pb-5">
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Plug size={12} className="text-purple-400" />
                <span className="text-[11.5px] font-medium text-ink-200">Claude Code</span>
              </div>
              <CopyBlock code={`claude mcp add --transport http alphastack http://localhost:3000/api/mcp`} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Code2 size={12} className="text-purple-400" />
                <span className="text-[11.5px] font-medium text-ink-200">
                  Any JSON-RPC client
                </span>
              </div>
              <CopyBlock
                code={`curl -X POST http://localhost:3000/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
              />
            </div>
            <div>
              <div className="mb-1.5 text-[11.5px] font-medium text-ink-200">REST invoke</div>
              <CopyBlock
                code={`curl -X POST http://localhost:3000/api/v1/tools \\
  -H "Authorization: Bearer <your key>" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"get_exhaustion_score","input":{"asset":"BTC"}}'`}
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Tool catalogue"
          subtitle={`${TOOL_DEFS.length} tools · also served at /api/v1/tools (GET)`}
          accent="#2dd4bf"
        />
        <div className="space-y-2 px-5 pb-5">
          {TOOL_DEFS.map((t) => {
            const m = MODULE_BY_ID[t.module];
            return (
              <div key={t.name} className="rounded-lg border border-ink-700/60 bg-ink-850/30 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mono text-[12.5px] font-medium text-ink-50">{t.name}</span>
                  {m && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider"
                      style={{ background: m.accentSoft, color: m.accent }}
                    >
                      {m.name}
                    </span>
                  )}
                  <span className="mono ml-auto text-[10.5px] text-ink-500">
                    {Object.keys(t.input_schema.properties).length} param
                    {Object.keys(t.input_schema.properties).length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">
                  {t.description.split(". ")[0]}.
                </p>
                {Object.keys(t.input_schema.properties).length > 0 && (
                  <div className="mono mt-2 flex flex-wrap gap-1.5">
                    {Object.keys(t.input_schema.properties).map((p) => (
                      <span
                        key={p}
                        className="rounded border border-ink-700/60 px-1.5 py-0.5 text-[10px] text-ink-400"
                      >
                        {p}
                        {t.input_schema.required?.includes(p) && (
                          <span className="text-red-400">*</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
