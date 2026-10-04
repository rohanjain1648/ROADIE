"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { STEPS } from "@/lib/agent/types";
import type { QCall } from "@/lib/qloo/types";
import { cx, Pill } from "./ui";
import type { AgentRunState } from "./useTourAgent";

function StatusDot({ status }: { status: string }) {
  if (status === "running") return <span className="pulse-ring h-2.5 w-2.5 rounded-full bg-acid" />;
  if (status === "done") return <span className="grid h-4 w-4 place-items-center rounded-full bg-acid/15 text-[10px] text-acid">✓</span>;
  if (status === "error") return <span className="grid h-4 w-4 place-items-center rounded-full bg-heat/15 text-[10px] text-heat">!</span>;
  return <span className="h-2 w-2 rounded-full bg-line" />;
}

function callLabel(c: QCall) {
  const type = c.params["filter.type"]?.replace("urn:entity:", "").replace("urn:", "");
  const loc = c.params["filter.location.query"] ?? c.params["signal.location.query"];
  if (c.endpoint === "/search") return `search "${c.params.query}"`;
  if (c.endpoint === "/v2/tags") return `tags "${c.params["filter.query"]}"`;
  if (c.endpoint === "/v2/insights/compare") return "compare a↔b";
  if (c.endpoint === "/v2/trending") return "trending";
  return `${type ?? "insights"}${loc ? ` @ ${loc}` : ""}`;
}

const statusTone: Record<QCall["status"], "acid" | "sky" | "amber" | "heat" | "default"> = {
  ok: "acid",
  cached: "sky",
  mock: "amber",
  error: "heat",
  rejected: "heat",
};

export function AgentTrace({ state }: { state: AgentRunState }) {
  const [showCalls, setShowCalls] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [state.calls.length]);

  return (
    <div className="rounded-2xl border border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">Agent trace</span>
          {state.status === "running" && <Pill tone="acid">live</Pill>}
        </div>
        <span className="font-mono text-[11px] text-muted">{state.calls.length} Qloo calls</span>
      </div>

      <ol className="space-y-0.5 px-2 py-2">
        {STEPS.map((s) => {
          const st = state.steps[s.id];
          const status = st?.status ?? "pending";
          return (
            <li key={s.id} className={cx("flex gap-3 rounded-lg px-2 py-1.5", status === "running" && "bg-acid/5")}>
              <span className="mt-1 grid w-4 shrink-0 place-items-center">
                <StatusDot status={status} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cx("text-[13px]", status === "pending" ? "text-muted/60" : "text-text")}>{s.label}</span>
                  {st?.ms !== undefined && <span className="shrink-0 font-mono text-[10px] text-muted">{(st.ms / 1000).toFixed(1)}s</span>}
                </div>
                {st?.detail && <div className={cx("truncate text-[11px]", status === "error" ? "text-heat" : "text-muted")}>{st.detail}</div>}
              </div>
            </li>
          );
        })}
      </ol>

      <AnimatePresence>
        {state.thoughts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1 border-t border-line px-4 py-3">
            {state.thoughts.map((t, i) => (
              <div key={i} className="text-[12px] italic text-muted">
                <span className="not-italic text-acid">↳ </span>
                {t}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="border-t border-line">
        <button
          onClick={() => setShowCalls((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-muted hover:text-text"
        >
          Qloo API calls <span>{showCalls ? "−" : "+"}</span>
        </button>
        {showCalls && (
          <div ref={logRef} className="scrollbar-thin max-h-56 overflow-y-auto px-4 pb-3 font-mono text-[11px]">
            {state.calls.length === 0 && <div className="text-muted/60">waiting…</div>}
            {state.calls.map((c) => (
              <div key={c.id} className="flex items-center gap-2 py-0.5" title={JSON.stringify(c.params, null, 1)}>
                <Pill tone={statusTone[c.status]} className="w-16 justify-center !px-1">{c.status}</Pill>
                <span className="text-muted">{c.endpoint.replace("/v2", "")}</span>
                <span className="min-w-0 flex-1 truncate text-text/90">{callLabel(c)}</span>
                <span className="text-muted">{c.status === "rejected" ? "blocked" : `${c.count}·${c.ms}ms`}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
