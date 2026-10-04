import type { TourPlan } from "@/lib/agent/types";
import { AffinityBar, Pill } from "./ui";

const AGE_LABELS: Record<string, string> = {
  "24_and_younger": "≤24",
  "25_to_29": "25–29",
  "30_to_34": "30–34",
  "35_to_44": "35–44",
  "45_to_54": "45–54",
  "55_and_older": "55+",
};

const CROSS_LABELS: Record<string, string> = {
  brand: "Brands",
  movie: "Films",
  tv_show: "TV",
  podcast: "Podcasts",
  book: "Books",
};

/** Diverging bar: over-index (acid) vs under-index (heat), centred on 0. */
function SkewBar({ label, value }: { label: string; value: number }) {
  const pct = Math.min(50, Math.abs(value) * 50);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-right font-mono text-muted">{label}</span>
      <div className="relative h-2.5 flex-1 rounded-full bg-panel-2">
        <span className="absolute inset-y-0 left-1/2 w-px bg-line" />
        <span
          className={`absolute inset-y-0 rounded-full ${value >= 0 ? "bg-acid" : "bg-heat"}`}
          style={value >= 0 ? { left: "50%", width: `${pct}%` } : { right: "50%", width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 font-mono text-[10px] text-muted">
        {value > 0 ? "+" : ""}
        {value.toFixed(2)}
      </span>
    </div>
  );
}

export function FanProfile({ plan }: { plan: Pick<TourPlan, "persona" | "fingerprint" | "artist" | "momentum"> }) {
  const { persona, fingerprint } = plan;
  const ages = fingerprint.demographics
    ? Object.entries(fingerprint.demographics.age).sort((a, b) => Object.keys(AGE_LABELS).indexOf(a[0]) - Object.keys(AGE_LABELS).indexOf(b[0]))
    : [];
  const genders = fingerprint.demographics ? Object.entries(fingerprint.demographics.gender) : [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-gradient-to-br from-acid/[0.07] to-transparent p-5">
        <div className="mb-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-acid">
          Fan persona {persona.source === "fallback" && <Pill tone="amber">template</Pill>}
        </div>
        <h3 className="font-display text-2xl font-bold tracking-tight">{persona.headline}</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text/85">{persona.summary}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {persona.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-[13px] text-text/80">
              <span className="text-acid">▸</span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 text-sm font-semibold">Taste fingerprint <span className="font-normal text-muted">· Qloo tags</span></div>
          <div className="flex flex-wrap gap-1.5">
            {fingerprint.tags.length === 0 && <span className="text-sm text-muted">No tag data.</span>}
            {fingerprint.tags.map((t, i) => (
              <span
                key={t.id || t.name}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={{
                  borderColor: `rgba(200,255,61,${0.15 + (1 - i / fingerprint.tags.length) * 0.5})`,
                  color: i < 4 ? "var(--acid)" : undefined,
                }}
                title={t.affinity !== undefined ? `affinity ${t.affinity.toFixed(3)}` : t.id}
              >
                {t.name}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-5">
          <div className="mb-3 text-sm font-semibold">Audience skew <span className="font-normal text-muted">· vs. average consumer</span></div>
          {!fingerprint.demographics && <div className="text-sm text-muted">No demographic data.</div>}
          <div className="space-y-1.5">
            {ages.map(([k, v]) => (
              <SkewBar key={k} label={AGE_LABELS[k] ?? k} value={v} />
            ))}
            {genders.length > 0 && <div className="h-2" />}
            {genders.map(([k, v]) => (
              <SkewBar key={k} label={k} value={v} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-5">
        <div className="mb-3 text-sm font-semibold">
          What these fans also love <span className="font-normal text-muted">· cross-domain affinity no LLM can guess</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(fingerprint.crossDomain).map(([type, list]) => (
            <div key={type}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">{CROSS_LABELS[type] ?? type}</div>
              <ul className="space-y-1.5">
                {(list ?? []).slice(0, 5).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-[13px]" title={e.id}>
                    <span className="truncate">{e.name}</span>
                    <AffinityBar value={e.affinity} />
                  </li>
                ))}
                {!list?.length && <li className="text-xs text-muted">—</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
