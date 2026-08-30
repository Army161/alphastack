import "server-only";
import { client } from "./index";
import { DDL } from "./ddl";

let ready: Promise<void> | null = null;

/**
 * Lazily creates the schema on first use. Keeps the app from ever being in a
 * "you forgot to run migrations" state during local evaluation or on a fresh
 * container boot.
 */
export function ensureSchema(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      for (const stmt of DDL) {
        await client.execute(stmt);
      }
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
