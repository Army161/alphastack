import { NextRequest, NextResponse } from "next/server";
import { TOOL_DEFS, runTool } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Model Context Protocol endpoint (JSON-RPC 2.0 over HTTP).
 *
 * Any MCP client — Claude Desktop, Claude Code, or a custom agent — can point
 * at this URL and get the full AlphaStack tool surface. The same TOOL_DEFS that
 * power ChatOS are served here, so the platform and the agent never drift.
 */

const PROTOCOL_VERSION = "2024-11-05";

type RpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

function ok(id: RpcRequest["id"], result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function err(id: RpcRequest["id"], code: number, message: string) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

export async function GET() {
  return NextResponse.json({
    name: "alphastack",
    version: "1.0.0",
    protocol: PROTOCOL_VERSION,
    transport: "http-jsonrpc",
    tools: TOOL_DEFS.length,
    hint: "POST JSON-RPC 2.0 here. Methods: initialize, tools/list, tools/call, ping.",
  });
}

export async function POST(req: NextRequest) {
  let body: RpcRequest | RpcRequest[];
  try {
    body = await req.json();
  } catch {
    return err(null, -32700, "Parse error");
  }

  // Batch requests
  if (Array.isArray(body)) {
    const results = await Promise.all(body.map((b) => handle(b)));
    return NextResponse.json(results);
  }

  const res = await handle(body);
  if (res === null) return new NextResponse(null, { status: 204 }); // notification
  return NextResponse.json(res);
}

async function handle(rpc: RpcRequest) {
  const { id, method, params } = rpc;
  const isNotification = id === undefined;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "alphastack", version: "1.0.0" },
          instructions:
            "AlphaStack exposes seven crypto intelligence modules as tools: Exhaustion (capitulation scoring), Radar (leverage crowding and liquidation levels), Terminal (thesis-fit screener), Ladder (exit rules engine), Sentinel (Solidity security scanning), Verdict (KOL prediction accountability), and Catalyst (event calendar and macro regime). Always call a tool before making a factual market claim.",
        },
      };

    case "notifications/initialized":
      return isNotification ? null : { jsonrpc: "2.0", id: id ?? null, result: {} };

    case "ping":
      return { jsonrpc: "2.0", id: id ?? null, result: {} };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          tools: TOOL_DEFS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.input_schema,
          })),
        },
      };

    case "tools/call": {
      const name = String(params?.name ?? "");
      const args = (params?.arguments ?? {}) as Record<string, unknown>;
      if (!TOOL_DEFS.some((t) => t.name === name)) {
        return {
          jsonrpc: "2.0",
          id: id ?? null,
          error: { code: -32602, message: `Unknown tool: ${name}` },
        };
      }
      const result = await runTool(name, args);
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        result: {
          content: [
            {
              type: "text",
              text: result.ok
                ? JSON.stringify(result.data, null, 2).slice(0, 100000)
                : `Error: ${result.error}`,
            },
          ],
          isError: !result.ok,
        },
      };
    }

    case "resources/list":
      return { jsonrpc: "2.0", id: id ?? null, result: { resources: [] } };

    case "prompts/list":
      return { jsonrpc: "2.0", id: id ?? null, result: { prompts: [] } };

    default:
      if (isNotification) return null;
      return {
        jsonrpc: "2.0",
        id: id ?? null,
        error: { code: -32601, message: `Method not found: ${method}` },
      };
  }
}
