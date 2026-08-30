"use client";

import * as React from "react";
import { Check, Copy, KeyRound } from "lucide-react";

export function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="group relative">
      <pre className="mono overflow-x-auto rounded-lg border border-ink-700/60 bg-ink-950 p-3 pr-10 text-[10.5px] leading-relaxed text-ink-300">
        {code}
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }}
        className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function RevealOnce({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="mt-4 rounded-xl border border-brand-500/35 bg-brand-500/[0.07] p-4">
      <div className="flex items-center gap-2">
        <KeyRound size={14} className="text-brand-400" />
        <span className="text-[13px] font-semibold text-ink-50">
          Copy this key now — it will not be shown again
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        <code className="mono flex-1 overflow-x-auto rounded-lg border border-ink-700/60 bg-ink-950 px-3 py-2 text-[11.5px] text-brand-400">
          {value}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-ink-300 transition-colors hover:bg-ink-800"
        >
          {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        Only a bcrypt hash is stored. Revoking is instant and irreversible.
      </p>
    </div>
  );
}
