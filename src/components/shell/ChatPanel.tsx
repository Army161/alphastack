"use client";

import * as React from "react";
import { ArrowUp, Loader2, Sparkles, Wrench, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./Markdown";
import { MODULE_BY_ID } from "@/lib/modules/registry";

export type ToolEvent = {
  name: string;
  module: string;
  status: "running" | "done" | "error";
  summary?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tools: ToolEvent[];
  streaming?: boolean;
};

export const SUGGESTIONS = [
  "Is the bottom in for Bitcoin?",
  "How crowded is leverage right now?",
  "Compare SOL and HYPE on thesis fit",
  "What catalysts are coming in the next 60 days?",
  "Who has the best prediction track record?",
  "Scan the sample contract for vulnerabilities",
  "Suggest an exit ladder for 2 BTC",
  "Give me a full market overview",
];

export function ChatPanel({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: q, tools: [] };
    const asstId = crypto.randomUUID();
    const history = [...messages, userMsg];

    setMessages([
      ...history,
      { id: asstId, role: "assistant", content: "", tools: [], streaming: true },
    ]);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (!part.trim()) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(part);
          } catch {
            continue;
          }
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== asstId) return m;
              if (evt.type === "text") {
                return { ...m, content: m.content + String(evt.text) };
              }
              if (evt.type === "tool") {
                const existing = m.tools.findIndex((t) => t.name === evt.name);
                const next = [...m.tools];
                const entry: ToolEvent = {
                  name: String(evt.name),
                  module: String(evt.module),
                  status: evt.status as ToolEvent["status"],
                  summary: evt.summary as string | undefined,
                };
                if (existing >= 0) next[existing] = entry;
                else next.push(entry);
                return { ...m, tools: next };
              }
              if (evt.type === "error") {
                return {
                  ...m,
                  content: m.content + `\n\n**Agent error:** ${String(evt.message)}`,
                  streaming: false,
                };
              }
              if (evt.type === "done") return { ...m, streaming: false };
              return m;
            })
          );
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === asstId
            ? {
                ...m,
                content: `**Connection error.** ${err instanceof Error ? err.message : "Unknown"}`,
                streaming: false,
              }
            : m
        )
      );
    } finally {
      setBusy(false);
      setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, streaming: false } : m)));
    }
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {!messages.length ? (
          <div className={cn("mx-auto", compact ? "max-w-md" : "max-w-2xl")}>
            <div className="mb-5 flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600">
                <Sparkles size={16} className="text-ink-950" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-ink-50">AlphaStack agent</div>
                <div className="text-[11.5px] text-ink-400">
                  Live tool access to all seven modules
                </div>
              </div>
            </div>
            <p className="mb-4 text-[12.5px] leading-relaxed text-ink-400">
              Ask anything. The agent calls the real module engines and cites what it got back —
              it never answers from memory.
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {SUGGESTIONS.slice(0, compact ? 4 : 8).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-ink-700/60 bg-ink-850/50 px-3 py-2.5 text-left text-[12px] text-ink-300 transition-all hover:border-brand-500/40 hover:bg-ink-800 hover:text-ink-100"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={cn("mx-auto space-y-5", compact ? "max-w-full" : "max-w-3xl")}>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ink-700/50 bg-ink-900/70 p-3 backdrop-blur">
        <div className={cn("mx-auto", compact ? "max-w-full" : "max-w-3xl")}>
          <div className="flex items-end gap-2 rounded-xl border border-ink-700/70 bg-ink-850/80 p-2 transition-colors focus-within:border-brand-500/50">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (taRef.current) {
                  taRef.current.style.height = "auto";
                  taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + "px";
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask the agent anything…"
              className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-ink-50 placeholder:text-ink-500 focus:outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || busy}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500 text-ink-950 transition-all hover:bg-brand-400 disabled:opacity-35"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={15} />}
            </button>
          </div>
          <p className="mt-2 px-1 text-[10.5px] text-ink-500">
            Analysis tool, not financial advice. Figures come from module engines.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-ink-750 px-3.5 py-2.5 text-[13px] text-ink-100">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
        <Sparkles size={13} className="text-ink-950" />
      </div>
      <div className="min-w-0 flex-1">
        {message.tools.length > 0 && (
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {message.tools.map((t) => {
              const mod = MODULE_BY_ID[t.module];
              return (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10.5px] font-medium"
                  style={{
                    borderColor: `${mod?.accent ?? "#5a6785"}44`,
                    background: `${mod?.accent ?? "#5a6785"}11`,
                    color: mod?.accent ?? "#8290ad",
                  }}
                >
                  {t.status === "running" ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : t.status === "done" ? (
                    <CheckCircle2 size={10} />
                  ) : (
                    <XCircle size={10} />
                  )}
                  <Wrench size={9} className="opacity-60" />
                  {t.name}
                  {mod && <span className="opacity-60">· {mod.name}</span>}
                </span>
              );
            })}
          </div>
        )}
        {message.content ? (
          <Markdown text={message.content} />
        ) : (
          <div className="flex items-center gap-2 text-[12px] text-ink-500">
            <Loader2 size={12} className="animate-spin" /> Working…
          </div>
        )}
        {message.streaming && message.content && (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-blink bg-brand-400" />
        )}
      </div>
    </div>
  );
}
