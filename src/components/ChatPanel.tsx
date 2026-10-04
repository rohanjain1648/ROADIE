"use client";

import { useRef, useState } from "react";
import type { TourPlan } from "@/lib/agent/types";
import { cx, Pill } from "./ui";

interface Msg {
  role: "user" | "assistant";
  content: string;
  steps?: Array<{ tool: string; args: Record<string, unknown>; ok: boolean }>;
}

const SUGGESTIONS = [
  "Which 3 podcasts should we advertise on, and why?",
  "Find a better-fit venue than the one in the 2nd city",
  "Swap the weakest stop for a hotter city in the same region",
  "What sneaker or streetwear brand fits this audience best?",
];

function renderText(text: string) {
  // minimal markdown: **bold**, bullets, line breaks
  return text.split("\n").map((line, i) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const parts = line.replace(/^\s*[-*•]\s+/, "").split(/(\*\*[^*]+\*\*)/g);
    const content = parts.map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>));
    return bullet ? (
      <div key={i} className="flex gap-2">
        <span className="text-acid">•</span>
        <span>{content}</span>
      </div>
    ) : (
      <div key={i} className={line.trim() ? "" : "h-2"}>{content}</div>
    );
  });
}

export function ChatPanel({ plan }: { plan: TourPlan }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content }) => ({ role, content })),
          tourId: plan.id,
          tour: { artist: plan.artist, stops: plan.stops, persona: plan.persona, request: plan.request },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMessages([...next, { role: "assistant", content: json.answer || "(no answer)", steps: json.steps }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : String(err)}` }]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
    }
  };

  return (
    <div className="flex h-[560px] flex-col rounded-2xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <div className="font-semibold">Ask ROADIE</div>
        <div className="text-xs text-muted">A tool-calling agent: it decides which Qloo tools to call (search → recommend → compare → city_heat) to answer.</div>
      </div>
      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="rounded-xl border border-line p-3 text-left text-[13px] text-muted hover:border-acid/50 hover:text-text">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "user" ? "bg-acid text-ink" : "bg-panel-2 text-text/90")}>
              {m.steps && m.steps.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {m.steps.map((s, j) => (
                    <Pill key={j} tone={s.ok ? "sky" : "heat"} className="font-mono">
                      {s.tool}
                    </Pill>
                  ))}
                </div>
              )}
              {m.role === "assistant" ? renderText(m.content) : m.content}
            </div>
          </div>
        ))}
        {loading && <div className="text-sm text-muted">ROADIE is querying the taste graph…</div>}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-line p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Which Austin bar would this crowd love for an after-party?"
          className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-acid/60"
          aria-label="Ask ROADIE a question"
        />
        <button disabled={loading} className="rounded-xl bg-acid px-4 text-sm font-semibold text-ink disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
