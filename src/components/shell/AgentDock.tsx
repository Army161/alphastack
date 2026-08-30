"use client";

import * as React from "react";
import Link from "next/link";
import { X, Maximize2, Sparkles } from "lucide-react";
import { ChatPanel } from "./ChatPanel";
import { cn } from "@/lib/utils";

export function AgentDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-ink-700/60 bg-ink-900/97 shadow-2xl backdrop-blur-xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-ink-700/50 px-4">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Sparkles size={13} className="text-ink-950" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-ink-50">ChatOS</div>
            <div className="text-[10px] text-ink-500">Agent dock · ⌘J</div>
          </div>
          <Link
            href="/chat"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-800 hover:text-ink-100"
            title="Open full ChatOS"
          >
            <Maximize2 size={14} />
          </Link>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-800 hover:text-ink-100"
          >
            <X size={15} />
          </button>
        </header>
        {open && <ChatPanel compact />}
      </aside>
    </>
  );
}
