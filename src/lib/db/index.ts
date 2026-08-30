import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Database URL resolution.
 *
 * Local dev  → a SQLite file next to the project.
 * Production → whatever DATABASE_URL points at. Turso (libsql://…) is the
 *              drop-in choice: same driver, same queries, zero code change.
 *
 * A serverless filesystem is read-only and ephemeral, so a file URL there
 * would fail on the first write. When DATABASE_URL is missing in production we
 * fall back to an in-memory database so the app still boots and every
 * stateless surface (all seven modules, ChatOS, the API and MCP endpoints)
 * works — but anything persisted is scoped to that instance's lifetime.
 */
function resolveUrl(): { url: string; ephemeral: boolean } {
  const configured = process.env.DATABASE_URL;
  if (configured) return { url: configured, ephemeral: false };

  const onServerless =
    process.env.VERCEL === "1" ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.NETLIFY === "true";

  if (onServerless) return { url: ":memory:", ephemeral: true };
  return { url: "file:alphastack.db", ephemeral: false };
}

const resolved = resolveUrl();

/** True when writes will not survive beyond this instance. */
export const STORAGE_IS_EPHEMERAL = resolved.ephemeral;

if (resolved.ephemeral) {
  console.warn(
    "[alphastack] DATABASE_URL is not set on a serverless host — using an in-memory database. " +
      "Accounts and saved state will not persist across instances. " +
      "Set DATABASE_URL to a Turso libsql:// URL (plus DATABASE_AUTH_TOKEN) for real persistence."
  );
}

const globalForDb = globalThis as unknown as {
  __alphastackClient?: ReturnType<typeof createClient>;
};

export const client =
  globalForDb.__alphastackClient ??
  createClient({ url: resolved.url, authToken: process.env.DATABASE_AUTH_TOKEN });

// Reuse the client across hot reloads in dev and across warm invocations in
// production — an in-memory database would otherwise reset on every import.
globalForDb.__alphastackClient = client;

export const db = drizzle(client, { schema });
export { schema };
