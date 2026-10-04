"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentEvent, MarketCity, Stop, StepId, TourPlan, TourRequest } from "@/lib/agent/types";
import type { QCall, QEntity } from "@/lib/qloo/types";

export type StepState = { status: "pending" | "running" | "done" | "error"; detail?: string; startedAt?: number; ms?: number };

export interface AgentRunState {
  status: "idle" | "running" | "done" | "error";
  request?: TourRequest;
  steps: Partial<Record<StepId, StepState>>;
  calls: QCall[];
  thoughts: string[];
  artist?: QEntity;
  persona?: TourPlan["persona"];
  fingerprint?: TourPlan["fingerprint"];
  market?: TourPlan["market"];
  stops: Array<Stop | undefined>;
  plan?: TourPlan;
  error?: string;
}

const initial: AgentRunState = { status: "idle", steps: {}, calls: [], thoughts: [], stops: [] };

/** Streams the /api/tour SSE response into incremental UI state. */
export function useTourAgent() {
  const [state, setState] = useState<AgentRunState>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const apply = useCallback((e: AgentEvent) => {
    setState((s) => {
      switch (e.type) {
        case "step": {
          const prev = s.steps[e.id];
          const now = Date.now();
          return {
            ...s,
            steps: {
              ...s.steps,
              [e.id]: {
                status: e.status,
                detail: e.detail,
                startedAt: e.status === "running" ? now : prev?.startedAt,
                ms: e.status !== "running" && prev?.startedAt ? now - prev.startedAt : undefined,
              },
            },
          };
        }
        case "call":
          return { ...s, calls: [...s.calls, e.call] };
        case "thought":
          return { ...s, thoughts: [...s.thoughts, e.text] };
        case "partial": {
          if (e.key === "stop") {
            const { index, stop } = e.data as { index: number; stop: Stop };
            const stops = [...s.stops];
            stops[index] = stop;
            return { ...s, stops };
          }
          if (e.key === "market") {
            const market = e.data as { cities: MarketCity[] } & TourPlan["market"];
            return { ...s, market };
          }
          return { ...s, [e.key]: e.data } as AgentRunState;
        }
        case "done":
          return { ...s, status: "done", plan: e.plan, stops: e.plan.stops };
        case "error":
          return { ...s, status: "error", error: e.message };
      }
    });
  }, []);

  const run = useCallback(
    async (req: TourRequest) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState({ ...initial, status: "running", request: req });
      try {
        const res = await fetch("/api/tour", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error ?? `HTTP ${res.status}`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let sep: number;
          while ((sep = buffer.indexOf("\n\n")) >= 0) {
            const chunk = buffer.slice(0, sep);
            buffer = buffer.slice(sep + 2);
            const line = chunk.split("\n").find((l) => l.startsWith("data: "));
            if (line) apply(JSON.parse(line.slice(6)) as AgentEvent);
          }
        }
        setState((s) => (s.status === "running" ? { ...s, status: "error", error: "Stream ended unexpectedly" } : s));
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setState((s) => ({ ...s, status: "error", error: err instanceof Error ? err.message : String(err) }));
      }
    },
    [apply],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initial);
  }, []);

  return { state, run, reset };
}
