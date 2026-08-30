"use client";

import * as React from "react";
import { Database, Radio, Clock } from "lucide-react";
import type { Provenance } from "@/lib/data/providers/types";
import { PROVIDERS } from "@/lib/data/providers/types";
import { cn, timeAgo } from "@/lib/utils";

const LABEL: Record<string, string> = {
  model: "Modelled",
  ...Object.fromEntries(Object.entries(PROVIDERS).map(([k, v]) => [k, v.label])),
};

/**
 * Shows exactly where a number came from. The platform's whole claim is that
 * every figure is traceable, so this belongs next to the figures — not buried
 * in a settings page.
 */
export function DataSource({
  prov,
  label,
  className,
}: {
  prov: Provenance;
  label?: string;
  className?: string;
}) {
  const isLive = prov.source !== "model";
  const name = LABEL[prov.source] ?? prov.source;

  return (
    <span
      title={
        isLive
          ? `${label ? label + " — " : ""}live from ${name}${
              prov.fetchedAt ? `, fetched ${timeAgo(prov.fetchedAt)}` : ""
            }${prov.stale ? " (serving cached while refreshing)" : ""}`
          : `${label ? label + " — " : ""}${prov.note ?? "deterministic model"}`
      }
      className={cn(
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-wider",
        isLive
          ? prov.stale
            ? "border-amber-500/30 bg-amber-500/[0.08] text-amber-400"
            : "border-green-500/30 bg-green-500/[0.08] text-green-400"
          : "border-ink-600/50 bg-ink-800/60 text-ink-400",
        className
      )}
    >
      {isLive ? (
        prov.stale ? <Clock size={9} /> : <Radio size={9} />
      ) : (
        <Database size={9} />
      )}
      {label ? `${label} · ` : ""}
      {isLive ? name : "modelled"}
    </span>
  );
}

export function DataSourceRow({
  items,
  className,
}: {
  items: { label: string; prov: Provenance }[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {items.map((i) => (
        <DataSource key={i.label} prov={i.prov} label={i.label} />
      ))}
    </div>
  );
}
