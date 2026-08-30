import { AlertTriangle } from "lucide-react";
import { STORAGE_IS_EPHEMERAL } from "@/lib/db";

/**
 * Shown only when the deployment has no persistent database configured, so
 * nobody mistakes a resetting demo for a broken product.
 */
export function StorageNotice() {
  if (!STORAGE_IS_EPHEMERAL) return null;
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3">
      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
      <p className="text-[12px] leading-relaxed text-ink-300">
        <span className="font-medium text-amber-400">Ephemeral storage.</span>{" "}
        No <code className="mono rounded bg-ink-800 px-1 text-[11px]">DATABASE_URL</code> is set on
        this deployment, so accounts and saved positions live only as long as this server instance.
        Every module, the agent, the API and the MCP endpoint work normally — they are stateless.
        Point <code className="mono rounded bg-ink-800 px-1 text-[11px]">DATABASE_URL</code> at a
        Turso database to make state permanent.
      </p>
    </div>
  );
}
