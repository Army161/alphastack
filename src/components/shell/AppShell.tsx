"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity, AlertTriangle, Bell, Calendar, ChevronRight, Command, Gauge,
  LayoutGrid, MessageSquare, Radar, Scale, Settings, Shield, Sparkles,
  Terminal, TrendingUp, Zap, X, Search, LogOut, CreditCard,
} from "lucide-react";
import { MODULES } from "@/lib/modules/registry";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@/components/ui/primitives";
import { AgentDock } from "./AgentDock";

const ICONS: Record<string, React.ElementType> = {
  gauge: Gauge,
  radar: Radar,
  terminal: Terminal,
  ladder: TrendingUp,
  shield: Shield,
  scale: Scale,
  calendar: Calendar,
};

export type ShellUser = {
  name: string | null;
  email: string;
  plan: string;
};

export function AppShell({
  user,
  unread,
  children,
}: {
  user: ShellUser;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [dockOpen, setDockOpen] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setDockOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col border-r border-ink-700/50 bg-ink-900/95 backdrop-blur-xl transition-transform lg:translate-x-0",
          navOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link href="/launchpad" className="flex items-center gap-2.5 px-5 py-5">
          <div className="relative grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Zap size={16} className="text-ink-950" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[14px] font-bold leading-none tracking-tight text-ink-50">
              AlphaStack
            </div>
            <div className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-ink-500">
              Intelligence OS
            </div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <NavItem href="/launchpad" icon={LayoutGrid} label="Launchpad" active={pathname === "/launchpad"} />
          <NavItem
            href="/chat"
            icon={MessageSquare}
            label="ChatOS"
            active={pathname === "/chat"}
            trailing={<Badge tone="brand">AI</Badge>}
          />

          <div className="mt-5 mb-2 px-3 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Modules
          </div>
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon] ?? Activity;
            return (
              <NavItem
                key={m.id}
                href={m.slug}
                icon={Icon}
                label={m.name}
                active={pathname === m.slug}
                accent={m.accent}
              />
            );
          })}

          <div className="mt-5 mb-2 px-3 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Workspace
          </div>
          <NavItem
            href="/alerts"
            icon={Bell}
            label="Alerts"
            active={pathname === "/alerts"}
            trailing={unread > 0 ? <Badge tone="neg">{unread}</Badge> : undefined}
          />
          <NavItem href="/developers" icon={Command} label="Developers" active={pathname === "/developers"} />
          <NavItem href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} />
        </nav>

        <div className="border-t border-ink-700/50 p-3">
          <div className="rounded-xl border border-ink-700/60 bg-ink-850/60 p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500/25 to-purple-500/25 text-[11px] font-bold text-brand-400">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] font-medium text-ink-100">
                  {user.name ?? user.email.split("@")[0]}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-ink-500">
                  {user.plan === "free" ? "Scout" : user.plan === "pro" ? "Operator" : "Desk"} plan
                </div>
              </div>
            </div>
            {user.plan === "free" && (
              <Link href="/pricing" className="mt-2.5 block">
                <Button size="sm" className="w-full">
                  <Sparkles size={12} /> Upgrade
                </Button>
              </Link>
            )}
            <div className="mt-2 flex gap-1">
              <Link href="/billing" className="flex-1">
                <Button size="sm" variant="ghost" className="w-full">
                  <CreditCard size={12} /> Billing
                </Button>
              </Link>
              <form action="/api/auth/signout" method="post" className="flex-1">
                <Button size="sm" variant="ghost" className="w-full" type="submit">
                  <LogOut size={12} /> Exit
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink-950/70 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[236px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink-700/50 bg-ink-900/85 px-4 backdrop-blur-xl lg:px-6">
          <button
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:bg-ink-800 lg:hidden"
            onClick={() => setNavOpen(true)}
          >
            <LayoutGrid size={16} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="group flex h-9 flex-1 items-center gap-2.5 rounded-lg border border-ink-700/60 bg-ink-850/60 px-3 text-left transition-colors hover:border-ink-600 md:max-w-sm"
          >
            <Search size={13} className="text-ink-500" />
            <span className="text-[12.5px] text-ink-500">Search modules, assets, actions…</span>
            <kbd className="mono ml-auto hidden rounded border border-ink-600/70 px-1.5 py-0.5 text-[9.5px] text-ink-400 md:block">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <LiveClock />
            <Link
              href="/alerts"
              className="relative grid h-8 w-8 place-items-center rounded-lg text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
            >
              <Bell size={15} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
              )}
            </Link>
            <Button size="sm" variant="secondary" onClick={() => setDockOpen(true)}>
              <Sparkles size={12} /> Ask agent
              <kbd className="mono ml-1 hidden rounded border border-ink-600/70 px-1 text-[9px] text-ink-400 md:inline">
                ⌘J
              </kbd>
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
      <AgentDock open={dockOpen} onClose={() => setDockOpen(false)} />
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  accent,
  trailing,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  accent?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12.5px] font-medium transition-all",
        active ? "bg-ink-800 text-ink-50" : "text-ink-400 hover:bg-ink-850/70 hover:text-ink-100"
      )}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full"
          style={{ background: accent ?? "#2dd4bf" }}
        />
      )}
      <Icon
        size={15}
        style={active && accent ? { color: accent } : undefined}
        className={cn(!active && "text-ink-500 group-hover:text-ink-300")}
      />
      <span className="flex-1">{label}</span>
      {trailing}
    </Link>
  );
}

function LiveClock() {
  const [now, setNow] = React.useState<string>("");
  React.useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-US", {
          hour12: false,
          timeZone: "UTC",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);
  return (
    <div className="mono hidden items-center gap-1.5 rounded-lg border border-ink-700/50 px-2.5 py-1.5 text-[11px] text-ink-400 md:flex">
      <span className="relative h-1.5 w-1.5 rounded-full bg-green-500 text-green-500 pulse-dot" />
      {now} UTC
    </div>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const items = [
    { label: "Launchpad", href: "/launchpad", hint: "All modules", group: "Navigate" },
    { label: "ChatOS", href: "/chat", hint: "Ask the agent", group: "Navigate" },
    ...MODULES.map((m) => ({
      label: m.name,
      href: m.slug,
      hint: m.tagline,
      group: "Modules",
    })),
    { label: "Alerts", href: "/alerts", hint: "Notification feed", group: "Workspace" },
    { label: "Developers", href: "/developers", hint: "API keys, MCP server", group: "Workspace" },
    { label: "Settings", href: "/settings", hint: "Profile & preferences", group: "Workspace" },
    { label: "Pricing", href: "/pricing", hint: "Plans & upgrade", group: "Workspace" },
  ];

  const filtered = q
    ? items.filter(
        (i) =>
          i.label.toLowerCase().includes(q.toLowerCase()) ||
          i.hint.toLowerCase().includes(q.toLowerCase())
      )
    : items;

  const groups = [...new Set(filtered.map((i) => i.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink-950/75 px-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-ink-600/60 bg-ink-850 shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-ink-700/60 px-4">
          <Search size={15} className="text-ink-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Jump to a module or action…"
            className="h-12 flex-1 bg-transparent text-[13.5px] text-ink-50 placeholder:text-ink-500 focus:outline-none"
          />
          <button onClick={onClose} className="text-ink-500 hover:text-ink-200">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {groups.map((g) => (
            <div key={g} className="mb-1">
              <div className="px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
                {g}
              </div>
              {filtered
                .filter((i) => i.group === g)
                .map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
                  >
                    <span className="font-medium">{i.label}</span>
                    <span className="truncate text-[11.5px] text-ink-500">{i.hint}</span>
                    <ChevronRight size={13} className="ml-auto text-ink-600" />
                  </Link>
                ))}
            </div>
          ))}
          {!filtered.length && (
            <div className="px-3 py-8 text-center text-[12.5px] text-ink-500">
              Nothing matches “{q}”.
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-ink-700/60 px-4 py-2 text-[10.5px] text-ink-500">
          <span className="flex items-center gap-1">
            <AlertTriangle size={10} /> Modelled data in local mode
          </span>
          <span className="mono ml-auto">⌘K toggle · ESC close</span>
        </div>
      </div>
    </div>
  );
}
