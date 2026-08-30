/**
 * Creates the SQLite schema. Idempotent — safe to run repeatedly.
 * The app also bootstraps lazily on first request, so this is optional.
 */
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const url = process.env.DATABASE_URL ?? "file:alphastack.db";
const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });

// Extract the DDL array from the TypeScript source without needing a compiler.
const src = readFileSync(new URL("../src/lib/db/ddl.ts", import.meta.url), "utf8");
const statements = [...src.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim()).filter(Boolean);

let created = 0;
for (const stmt of statements) {
  if (!/^CREATE\s+(TABLE|INDEX)/i.test(stmt)) continue;
  await client.execute(stmt);
  created++;
}

console.log(`✓ AlphaStack schema ready — ${created} statements applied to ${url}`);
process.exit(0);
