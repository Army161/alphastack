import { Sparkles, Wrench } from "lucide-react";
import { ChatPanel } from "@/components/shell/ChatPanel";
import { TOOL_DEFS } from "@/lib/agent/tools";
import { hasLlm } from "@/lib/agent/runtime";
import { MODULE_BY_ID } from "@/lib/modules/registry";
import { Badge, Card } from "@/components/ui/primitives";

export const metadata = { title: "ChatOS" };
export const dynamic = "force-dynamic";

export default function ChatPage() {
  const llm = hasLlm();
  const byModule = TOOL_DEFS.reduce<Record<string, string[]>>((acc, t) => {
    (acc[t.module] ??= []).push(t.name);
    return acc;
  }, {});

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-[1400px] gap-4">
      <Card className="flex min-w-0 flex-1 flex-col overflow-hidden p-0">
        <div className="flex shrink-0 items-center gap-2.5 border-b border-ink-700/50 px-5 py-3.5">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600">
            <Sparkles size={15} className="text-ink-950" />
          </div>
          <div>
            <h1 className="text-[14px] font-semibold text-ink-50">ChatOS</h1>
            <p className="text-[11px] text-ink-500">
              {TOOL_DEFS.length} tools across 7 modules
            </p>
          </div>
          <Badge tone={llm ? "pos" : "warn"} dot className="ml-auto">
            {llm ? "LLM synthesis" : "Local reasoning"}
          </Badge>
        </div>
        <ChatPanel />
      </Card>

      <aside className="hidden w-[280px] shrink-0 overflow-y-auto xl:block">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Wrench size={13} className="text-ink-500" />
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-ink-300">
              Available tools
            </h2>
          </div>
          <div className="mt-3.5 space-y-3.5">
            {Object.entries(byModule).map(([moduleId, tools]) => {
              const m = MODULE_BY_ID[moduleId];
              return (
                <div key={moduleId}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: m?.accent ?? "#5a6785" }}
                    />
                    <span className="text-[11.5px] font-medium text-ink-200">
                      {m?.name ?? moduleId}
                    </span>
                  </div>
                  <div className="mt-1.5 space-y-1 pl-3.5">
                    {tools.map((t) => (
                      <div key={t} className="mono text-[10.5px] text-ink-500">
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 rounded-lg border border-ink-700/60 bg-ink-850/40 p-3">
            <p className="text-[11px] leading-relaxed text-ink-400">
              {llm
                ? "Full natural-language synthesis is active. The agent chains tool calls and reconciles conflicting readings across modules."
                : "Running in local reasoning mode: intent is routed to the real module engines and results are formatted directly. Add ANTHROPIC_API_KEY to .env.local for full synthesis."}
            </p>
          </div>

          <div className="mt-3 rounded-lg border border-ink-700/60 bg-ink-850/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-500">Also over MCP</div>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-400">
              The identical tool surface is served at <span className="mono text-brand-400">/api/mcp</span> for
              Claude Desktop, Claude Code and any MCP client.
            </p>
          </div>
        </Card>
      </aside>
    </div>
  );
}
