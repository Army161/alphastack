#!/usr/bin/env node
/**
 * AlphaStack MCP server (stdio transport).
 *
 * Bridges any stdio MCP client — Claude Desktop, Claude Code — to a running
 * AlphaStack instance. All fourteen module tools are proxied over the HTTP
 * JSON-RPC endpoint, so the client sees exactly the same surface the in-app
 * agent uses.
 *
 * Usage:
 *   ALPHASTACK_URL=http://localhost:3000 node mcp-server/index.mjs
 *
 * claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "alphastack": {
 *         "command": "node",
 *         "args": ["/abs/path/to/alphastack/mcp-server/index.mjs"],
 *         "env": { "ALPHASTACK_URL": "http://localhost:3000" }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = (process.env.ALPHASTACK_URL ?? "http://localhost:3000").replace(/\/$/, "");
const KEY = process.env.ALPHASTACK_KEY ?? "";

async function rpc(method, params) {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
  });
  if (!res.ok) throw new Error(`AlphaStack returned HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result;
}

const server = new Server(
  { name: "alphastack", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const result = await rpc("tools/list", {});
    return { tools: result.tools ?? [] };
  } catch (err) {
    process.stderr.write(`[alphastack] tools/list failed: ${err.message}\n`);
    return { tools: [] };
  }
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await rpc("tools/call", { name, arguments: args ?? {} });
    return {
      content: result.content ?? [{ type: "text", text: JSON.stringify(result) }],
      isError: Boolean(result.isError),
    };
  } catch (err) {
    return {
      content: [
        {
          type: "text",
          text: `AlphaStack tool "${name}" failed: ${err.message}. Is the server running at ${BASE}?`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
process.stderr.write(`[alphastack] MCP server ready — proxying ${BASE}/api/mcp\n`);
