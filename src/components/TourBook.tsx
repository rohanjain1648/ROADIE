"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { TourPlan } from "@/lib/agent/types";
import { getRegion } from "@/lib/geo/cities";
import { ChatPanel } from "./ChatPanel";
import { CompareView } from "./CompareView";
import { FanProfile } from "./FanProfile";
import { PartnersPanel } from "./PartnersPanel";
import { StopCard } from "./StopCard";
import { cx, ModeBanner, Pill } from "./ui";

const TourMap = dynamic(() => import("./TourMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-panel-2" />,
});

type Tab = "tour" | "fans" | "partners" | "compare" | "ask";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "tour", label: "Tour" },
  { id: "fans", label: "Fans" },
  { id: "partners", label: "Partners & critic" },
  { id: "compare", label: "With vs. without Qloo" },
  { id: "ask", label: "Ask ROADIE" },
];

export function TourBook({ plan, showMap = true }: { plan: TourPlan; showMap?: boolean }) {
  const [tab, setTab] = useState<Tab>("tour");
  const [shared, setShared] = useState(false);
  const region = getRegion(plan.request.region);

  const share = async () => {
    const url = `${window.location.origin}/tour/${plan.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      window.prompt("Share link", url);
    }
  };

  const download = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roadie-${plan.artist.name.replace(/\W+/g, "-").toLowerCase()}-${plan.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-[0.2em] text-acid">Tour book · {region.label}</div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{plan.artist.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{plan.stops.length} shows</span>·<span>{plan.stops[0]?.date} → {plan.stops.at(-1)?.date}</span>·
            <span>{plan.route.totalKm.toLocaleString()} km</span>
            <Pill tone="acid">{plan.stats.groundedRecs} grounded recs</Pill>
            {plan.request.kind === "comedy" && <Pill tone="heat">comedy</Pill>}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={share} className="rounded-xl border border-line px-3 py-2 text-sm hover:border-acid/50">
            {shared ? "Link copied ✓" : "Share"}
          </button>
          <button onClick={download} className="rounded-xl border border-line px-3 py-2 text-sm hover:border-acid/50">
            Export JSON
          </button>
          <button onClick={() => window.print()} className="hidden rounded-xl border border-line px-3 py-2 text-sm hover:border-acid/50 sm:block">
            Print
          </button>
        </div>
      </div>

      <ModeBanner mode={plan.mode} />

      {showMap && (
        <div className="h-[340px] overflow-hidden rounded-2xl border border-line sm:h-[420px]">
          <TourMap
            center={region.center}
            zoom={region.zoom}
            heatPoints={plan.market.heatPoints}
            cities={plan.market.cities}
            stops={plan.stops}
            className="h-full w-full"
          />
        </div>
      )}

      <div className="scrollbar-thin -mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1 rounded-xl border border-line bg-panel p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cx(
                "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm transition",
                tab === t.id ? "bg-text font-semibold text-ink" : "text-muted hover:text-text",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "tour" && (
        <div className="grid gap-4">
          {plan.stops.map((s, i) => (
            <StopCard key={s.city} stop={s} index={i} kind={plan.request.kind} />
          ))}
          <div className="rounded-2xl border border-line bg-panel p-4 text-sm text-muted">
            <span className="text-text">Markets passed over: </span>
            {plan.market.cities
              .filter((c) => !plan.stops.some((s) => s.city === c.name))
              .slice(0, 8)
              .map((c) => `${c.name} (${c.heat})`)
              .join(" · ")}
          </div>
        </div>
      )}
      {tab === "fans" && <FanProfile plan={plan} />}
      {tab === "partners" && <PartnersPanel plan={plan} />}
      {tab === "compare" && <CompareView plan={plan} />}
      {tab === "ask" && <ChatPanel plan={plan} />}
    </div>
  );
}
