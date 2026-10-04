"use client";

import { useState } from "react";
import type { BaselineResult } from "@/lib/agent/baseline";
import type { TourPlan } from "@/lib/agent/types";
import { cx, Pill } from "./ui";

const statusPill = {
  verified: <Pill tone="acid">found in Qloo</Pill>,
  "not-found": <Pill tone="heat">not found</Pill>,
  unchecked: <Pill>unchecked</Pill>,
};

export function CompareView({ plan }: { plan: TourPlan }) {
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(plan.request),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const roadieRecs = plan.stops.flatMap((s) => [s.venue.pick, ...s.openers, s.hospitality.preShow]).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl">
          <h3 className="font-display text-xl font-bold">With Qloo vs. without</h3>
          <p className="mt-1 text-sm text-muted">
            The same brief, answered by the bare LLM from memory. Every name it gives is then looked up in Qloo&apos;s entity graph.
            &quot;Not found&quot; means Qloo can&apos;t verify the place, act or brand exists — so you can&apos;t trust or act on it.
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="rounded-xl bg-text px-4 py-2 text-sm font-semibold text-ink transition hover:bg-acid disabled:opacity-60"
        >
          {loading ? "Asking the LLM alone…" : result ? "Run again" : "Run LLM-only baseline"}
        </button>
      </div>
      {error && <div className="rounded-lg border border-heat/30 bg-heat/5 p-3 text-sm text-heat">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">LLM only</div>
            {result?.summary.verifiedRate !== null && result?.summary.verifiedRate !== undefined && (
              <div className={cx("font-display text-2xl font-extrabold", result.summary.verifiedRate < 0.6 ? "text-heat" : "text-amber")}>
                {Math.round(result.summary.verifiedRate * 100)}%<span className="ml-1 text-xs font-medium text-muted">verifiable</span>
              </div>
            )}
          </div>
          {!result && !loading && <div className="text-sm text-muted">Run the baseline to compare.</div>}
          {result && !result.available && <div className="text-sm text-amber">{result.note}</div>}
          {result?.note && result.available && <div className="mb-3 text-xs text-amber">{result.note}</div>}
          <div className="space-y-3">
            {result?.cities.map((c) => (
              <div key={c.city} className="rounded-xl bg-panel-2 p-3 text-[13px]">
                <div className="mb-1 font-semibold">{c.city}</div>
                {(["venue", "opener", "restaurant", "brandPartner"] as const).map((f) => {
                  const check = result.checks.find((x) => x.city === c.city && x.field === f);
                  return (
                    <div key={f} className="flex items-center justify-between gap-2 py-0.5">
                      <span className="min-w-0 truncate">
                        <span className="text-muted">{f === "brandPartner" ? "brand" : f}: </span>
                        {c[f]}
                      </span>
                      {check && statusPill[check.status]}
                    </div>
                  );
                })}
                <div className="mt-1 text-xs text-muted">{c.reason}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-acid/30 bg-acid/[0.03] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">ROADIE + Qloo</div>
            <div className="font-display text-2xl font-extrabold text-acid">
              {roadieRecs ? Math.round((plan.stats.groundedRecs / roadieRecs) * 100) : 0}%<span className="ml-1 text-xs font-medium text-muted">grounded</span>
            </div>
          </div>
          <div className="space-y-3">
            {plan.stops.map((s) => (
              <div key={s.city} className="rounded-xl bg-panel-2 p-3 text-[13px]">
                <div className="mb-1 flex items-center justify-between font-semibold">
                  {s.city} <span className="font-mono text-[11px] font-normal text-acid">heat {s.heat}</span>
                </div>
                <div className="py-0.5"><span className="text-muted">venue: </span>{s.venue.pick?.name ?? "—"} <span className="font-mono text-[10px] text-muted">{s.venue.pick?.affinity?.toFixed(2)}</span></div>
                <div className="py-0.5"><span className="text-muted">opener: </span>{s.openers[0]?.name ?? "—"}</div>
                <div className="py-0.5"><span className="text-muted">restaurant: </span>{s.hospitality.preShow?.name ?? "—"}</div>
                <div className="py-0.5"><span className="text-muted">brand: </span>{plan.brands[0]?.entity.name ?? "—"}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted">
        Method: names are matched against Qloo <code className="font-mono">/search</code> (fuzzy name match + city check for places). A real place missing from Qloo would also show as &quot;not found&quot;, so this measures <em>verifiability</em>, the property an agent needs before acting.
      </p>
    </div>
  );
}
