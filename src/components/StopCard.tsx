"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Stop } from "@/lib/agent/types";
import { cx, EntityRow, Pill } from "./ui";

function fmtDate(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  return {
    dow: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    day: d.getUTCDate(),
    mon: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

function HeatMeter({ heat }: { heat: number }) {
  const tone = heat >= 70 ? "text-acid" : heat >= 40 ? "text-amber" : "text-heat";
  return (
    <div className="text-center">
      <div className={cx("font-display text-2xl font-extrabold leading-none", tone)}>{heat}</div>
      <div className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted">fan heat</div>
    </div>
  );
}

type Tab = "plan" | "promo" | "pitch";

export function StopCard({ stop, index, kind }: { stop: Stop; index: number; kind: "music" | "comedy" }) {
  const [tab, setTab] = useState<Tab>("plan");
  const [copied, setCopied] = useState(false);
  const d = fmtDate(stop.date);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      className="flex overflow-hidden rounded-2xl border border-line bg-panel"
    >
      {/* stub */}
      <div className="flex w-20 shrink-0 flex-col items-center justify-between bg-panel-2 py-4 sm:w-24">
        <div className="font-mono text-[10px] text-muted">#{String(index + 1).padStart(2, "0")}</div>
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-widest text-muted">{d.dow}</div>
          <div className="font-display text-3xl font-extrabold leading-none text-text">{d.day}</div>
          <div className="text-[10px] font-semibold tracking-widest text-acid">{d.mon}</div>
        </div>
        <HeatMeter heat={stop.heat} />
      </div>
      <div className="ticket-perf shrink-0 bg-panel-2" aria-hidden />

      {/* body */}
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-tight">
            {stop.city} <span className="text-sm font-medium text-muted">{stop.country}</span>
          </h3>
          <div className="flex gap-1 rounded-lg border border-line p-0.5 text-[11px]">
            {(["plan", "promo", "pitch"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cx("rounded-md px-2.5 py-1 capitalize", tab === t ? "bg-acid text-ink" : "text-muted hover:text-text")}
              >
                {t === "pitch" ? "Venue pitch" : t}
              </button>
            ))}
          </div>
        </div>

        {tab === "plan" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-acid/20 bg-acid/[0.04] p-3">
              <EntityRow entity={stop.venue.pick} label="Venue" />
              {stop.venue.why && <p className="mt-2 text-[13px] leading-relaxed text-text/80">{stop.venue.why}</p>}
              {stop.venue.alternates.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
                  <span>Alternates:</span>
                  {stop.venue.alternates.map((a) => (
                    <span key={a.id} className="rounded border border-line px-1.5 py-0.5" title={`${a.id} · affinity ${a.affinity?.toFixed(2)}`}>
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">{kind === "comedy" ? "Support acts" : "Openers"}</div>
                {stop.openers.length ? stop.openers.map((o) => <EntityRow key={o.id} entity={o} compact />) : <div className="text-sm text-muted">—</div>}
              </div>
              <EntityRow entity={stop.hospitality.preShow} label="Pre-show dinner" compact />
              <EntityRow entity={stop.hospitality.afterParty} label="After-party" compact />
            </div>
            {stop.localMaterial.length > 0 && (
              <div className="rounded-xl border border-heat/25 bg-heat/[0.05] p-3">
                <div className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-heat">
                  Local material <Pill tone="heat">comedy</Pill>
                </div>
                <ul className="list-disc space-y-1 pl-4 text-[13px] text-text/85">
                  {stop.localMaterial.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "promo" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Pill tone="sky">{stop.marketing.language}</Pill>
              {stop.llm === "fallback" && <Pill tone="amber">template</Pill>}
            </div>
            <div className="font-display text-base font-bold">{stop.marketing.headline}</div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text/85">{stop.marketing.copy}</p>
            <div className="flex flex-wrap gap-1.5">
              {stop.marketing.hashtags.map((h) => (
                <span key={h} className="font-mono text-xs text-acid">{h.startsWith("#") ? h : `#${h}`}</span>
              ))}
            </div>
            <button
              onClick={() => copy(`${stop.marketing.headline}\n\n${stop.marketing.copy}\n\n${stop.marketing.hashtags.join(" ")}`)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-acid/50"
            >
              {copied ? "Copied ✓" : "Copy post"}
            </button>
          </div>
        )}

        {tab === "pitch" && (
          <div className="space-y-2">
            <div className="text-xs text-muted">
              To: booking@{(stop.venue.pick?.name ?? "venue").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com <span className="text-muted/60">(placeholder)</span>
            </div>
            <div className="text-sm font-semibold">Subject: {stop.venuePitch.subject}</div>
            <p className="whitespace-pre-line rounded-lg bg-panel-2 p-3 text-[13px] leading-relaxed text-text/85">{stop.venuePitch.body}</p>
            <button
              onClick={() => copy(`Subject: ${stop.venuePitch.subject}\n\n${stop.venuePitch.body}`)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs hover:border-acid/50"
            >
              {copied ? "Copied ✓" : "Copy email"}
            </button>
          </div>
        )}
      </div>
    </motion.article>
  );
}

export function StopSkeleton({ city, index }: { city?: string; index: number }) {
  return (
    <div className="flex h-40 animate-pulse overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="w-20 bg-panel-2 sm:w-24" />
      <div className="flex-1 p-5">
        <div className="text-sm text-muted">
          #{index + 1} {city ? `${city} — ` : ""}planning stop…
        </div>
        <div className="mt-3 h-3 w-2/3 rounded bg-line" />
        <div className="mt-2 h-3 w-1/2 rounded bg-line" />
      </div>
    </div>
  );
}
