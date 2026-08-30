import * as React from "react";
import { Badge } from "./primitives";
import { MODULE_BY_ID } from "@/lib/modules/registry";

export function PageHeader({
  moduleId,
  action,
  children,
}: {
  moduleId: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const m = MODULE_BY_ID[moduleId];
  if (!m) return null;
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="h-5 w-1 rounded-full" style={{ background: m.accent }} />
            <h1 className="text-2xl font-bold tracking-tight text-ink-50">{m.name}</h1>
            <Badge tone="neutral">{m.category}</Badge>
          </div>
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-400">
            {m.description}
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}
