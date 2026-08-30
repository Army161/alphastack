import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- Card */

export function Card({
  className,
  children,
  glow,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { glow?: string }) {
  return (
    <div
      className={cn("card relative overflow-hidden", className)}
      style={glow ? { boxShadow: `0 0 0 1px ${glow}22, 0 8px 32px -12px ${glow}33` } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  accent,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-4 pb-3", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {accent && (
            <span className="h-3.5 w-1 rounded-full" style={{ background: accent }} />
          )}
          <h3 className="text-[13px] font-semibold tracking-wide text-ink-100 uppercase">
            {title}
          </h3>
        </div>
        {subtitle && <p className="mt-1 text-xs text-ink-400 leading-relaxed">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Button */

const buttonVariants = {
  primary:
    "bg-brand-500 text-ink-950 hover:bg-brand-400 font-semibold shadow-[0_2px_16px_-4px_rgba(45,212,191,0.5)]",
  secondary: "bg-ink-750 text-ink-100 hover:bg-ink-700 border border-ink-600/60",
  ghost: "text-ink-300 hover:text-ink-50 hover:bg-ink-800",
  outline: "border border-ink-600 text-ink-100 hover:bg-ink-800 hover:border-ink-500",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
} as const;

const buttonSizes = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-9.5 px-4 text-[13px] rounded-lg gap-2",
  lg: "h-11 px-6 text-sm rounded-xl gap-2",
} as const;

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap transition-all duration-150",
        "disabled:opacity-45 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-900",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "pos" | "neg" | "warn" | "info" | "brand";
  className?: string;
  dot?: boolean;
}) {
  const tones = {
    neutral: "bg-ink-750 text-ink-300 border-ink-600/50",
    pos: "bg-green-500/12 text-green-400 border-green-500/25",
    neg: "bg-red-500/12 text-red-400 border-red-500/25",
    warn: "bg-amber-500/12 text-amber-400 border-amber-500/25",
    info: "bg-sky-500/12 text-sky-400 border-sky-500/25",
    brand: "bg-brand-500/12 text-brand-400 border-brand-500/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- Stat */

export function Stat({
  label,
  value,
  sub,
  tone,
  accent,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: "pos" | "neg" | "neutral";
  accent?: string;
  className?: string;
}) {
  const toneClass =
    tone === "pos" ? "text-green-400" : tone === "neg" ? "text-red-400" : "text-ink-50";
  return (
    <div className={cn("px-5 py-4", className)}>
      <div className="text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink-400">
        {label}
      </div>
      <div
        className={cn("mono mt-1.5 text-2xl font-semibold leading-none", toneClass)}
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11.5px] text-ink-400 leading-snug">{sub}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- Input */

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9.5 w-full rounded-lg border border-ink-600/70 bg-ink-850/80 px-3 text-[13px] text-ink-50",
        "placeholder:text-ink-500 transition-colors",
        "focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-9.5 rounded-lg border border-ink-600/70 bg-ink-850 px-3 text-[13px] text-ink-100",
        "focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-ink-600/70 bg-ink-850/80 px-3 py-2.5 text-[13px] text-ink-50",
        "placeholder:text-ink-500 transition-colors resize-y",
        "focus:border-brand-500/70 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
        className
      )}
      {...props}
    />
  );
}

/* ---------------------------------------------------------------- Misc */

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-ink-700/50", className)} />;
}

export function Meter({
  value,
  max = 100,
  color = "#2dd4bf",
  height = 6,
  className,
  track = "rgba(90,103,133,0.18)",
}: {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  className?: string;
  track?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full", className)}
      style={{ height, background: track }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 h-10 w-10 rounded-xl border border-ink-600/60 bg-ink-800/60" />
      <h4 className="text-sm font-semibold text-ink-100">{title}</h4>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-400">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LockedOverlay({ plan, feature }: { plan: string; feature: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-[14px] bg-ink-900/82 backdrop-blur-[3px]">
      <Badge tone="brand">{plan} feature</Badge>
      <p className="max-w-[15rem] text-center text-xs leading-relaxed text-ink-300">{feature}</p>
      <a href="/pricing">
        <Button size="sm">Upgrade</Button>
      </a>
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  accent = "#2dd4bf",
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  accent?: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-ink-700/50 px-2">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative whitespace-nowrap px-3.5 py-2.5 text-[12.5px] font-medium transition-colors",
              active ? "text-ink-50" : "text-ink-400 hover:text-ink-200"
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 rounded-full bg-ink-750 px-1.5 py-0.5 text-[10px] text-ink-300">
                {t.count}
              </span>
            )}
            {active && (
              <span
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full"
                style={{ background: accent }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
