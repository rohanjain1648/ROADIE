import type { TourPlan } from "@/lib/agent/types";
import { AffinityBar, Pill } from "./ui";

export function PartnersPanel({ plan }: { plan: Pick<TourPlan, "brands" | "audiences" | "critic" | "stats" | "market"> }) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 text-sm font-semibold">
          Brand partners <span className="font-normal text-muted">· ranked by Qloo audience overlap, themes from /compare</span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {plan.brands.length === 0 && <div className="text-sm text-muted">No brand affinity data for this act.</div>}
          {plan.brands.map((b) => (
            <div key={b.entity.id} className="flex flex-col rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="font-display text-base font-bold">{b.entity.name}</div>
                <AffinityBar value={b.entity.affinity} />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {b.sharedThemes.map((t) => (
                  <Pill key={t} tone="sky">{t}</Pill>
                ))}
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-text/80">{b.pitch}</p>
              <div className="mt-2 truncate font-mono text-[10px] text-muted/60">{b.entity.id}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 text-sm font-semibold">Ad audiences <span className="font-normal text-muted">· target these segments</span></div>
          <ul className="space-y-2">
            {plan.audiences.length === 0 && <li className="text-sm text-muted">No audience data.</li>}
            {plan.audiences.map((a) => (
              <li key={a.id || a.name} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{a.name}</div>
                  {a.parentType && <div className="truncate font-mono text-[10px] text-muted">{a.parentType.replace("urn:audience:", "")}</div>}
                </div>
                <AffinityBar value={a.affinity} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 text-sm font-semibold">Critic report <span className="font-normal text-muted">· the agent checks its own work</span></div>
          <ul className="space-y-2">
            {plan.critic.checks.map((c) => (
              <li key={c.label} className="flex gap-2 text-sm">
                <span className={c.pass ? "text-acid" : "text-heat"}>{c.pass ? "✓" : "✗"}</span>
                <div>
                  <div>{c.label}</div>
                  <div className="text-xs text-muted">{c.detail}</div>
                </div>
              </li>
            ))}
          </ul>
          {plan.critic.fixes.length > 0 && (
            <details className="mt-3 text-xs text-muted">
              <summary className="cursor-pointer">Auto-repairs ({plan.critic.fixes.length})</summary>
              <ul className="mt-1 list-disc pl-4">
                {plan.critic.fixes.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
            <div>
              <div className="font-display text-lg font-bold text-acid">{plan.stats.qlooCalls}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">Qloo calls</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-acid">{plan.stats.groundedRecs}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">grounded recs</div>
            </div>
            <div>
              <div className="font-display text-lg font-bold text-acid">{(plan.stats.ms / 1000).toFixed(1)}s</div>
              <div className="text-[10px] uppercase tracking-wider text-muted">{plan.market.method === "heatmap" ? "heatmap" : "fallback"} run</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
