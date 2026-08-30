import { NextRequest, NextResponse } from "next/server";
import { TOOL_DEFS, runTool } from "@/lib/agent/tools";
import { getCurrentUser } from "@/lib/auth/session";
import { ensureSchema } from "@/lib/db/bootstrap";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/v1/tools — machine-readable tool catalogue. */
export async function GET() {
  return NextResponse.json({
    version: "1.0",
    tools: TOOL_DEFS.map((t) => ({
      name: t.name,
      module: t.module,
      description: t.description,
      input_schema: t.input_schema,
    })),
    endpoints: {
      invoke: "POST /api/v1/tools  { tool, input }",
      mcp: "POST /api/mcp (JSON-RPC 2.0, Model Context Protocol)",
    },
    auth: "Bearer <api key> header, or an active session cookie.",
  });
}

async function authorise(req: NextRequest): Promise<boolean> {
  const session = await getCurrentUser();
  if (session) return true;

  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return false;
  const raw = header.slice(7).trim();
  const prefix = raw.slice(0, 10);

  const rows = await db.select().from(apiKeys).where(eq(apiKeys.prefix, prefix)).limit(5);
  for (const row of rows) {
    if (row.revoked) continue;
    if (await bcrypt.compare(raw, row.hash)) {
      await db
        .update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, row.id));
      return true;
    }
  }
  return false;
}

/** POST /api/v1/tools — invoke a tool. */
export async function POST(req: NextRequest) {
  await ensureSchema();
  if (!(await authorise(req))) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a Bearer API key or sign in." },
      { status: 401 }
    );
  }

  let body: { tool?: string; input?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.tool) {
    return NextResponse.json(
      { error: "Missing 'tool'.", available: TOOL_DEFS.map((t) => t.name) },
      { status: 400 }
    );
  }

  const result = await runTool(body.tool, body.input ?? {});
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ tool: body.tool, data: result.data });
}
