"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { AgentTrace } from "@/components/AgentTrace";
import { StopCard, StopSkeleton } from "@/components/StopCard";
import { TourBook } from "@/components/TourBook";
import { buildRequest, TourForm } from "@/components/TourForm";
import { Pill } from "@/components/ui";
import { useTourAgent } from "@/components/useTourAgent";
import type { TourRequest } from "@/lib/agent/types";
import { getRegion } from "@/lib/geo/cities";

const TourMap = dynamic(() => import("@/components/TourMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-panel-2" />,
});

export function PlanClient() {
  const params = useSearchParams();
  const { state, run, reset } = useTourAgent();
  const autoRan = useRef(false);

  const initial = useMemo<Partial<TourRequest>>(() => {
    const p: Partial<TourRequest> = {};
    const artist = params.get("artist");
    if (artist) p.artist = artist;
    const kind = params.get("kind");
    if (kind === "music" || kind === "comedy") p.kind = kind;
    const region = params.get("region");
    if (region) p.region = region;
    const language = params.get("language");
    if (language) p.language = language;
    const shows = Number(params.get("shows"));
    if (shows >= 2 && shows <= 12) p.shows = shows;
    const capacity = params.get("capacity");
    if (capacity === "intimate" || capacity === "club" || capacity === "theatre" || capacity === "arena") p.capacity = capacity;
    return p;
  }, [params]);

  // ?auto=1 demo links start the agent immediately.
  useEffect(() => {
    if (params.get("auto") === "1" && initial.artist && !autoRan.current) {
      autoRan.current = true;
      run(buildRequest(initial));
    }
  }, [params, initial, run]);

  const region = getRegion(state.request?.region ?? initial.region ?? "north-america");
  const stopsPlanned = state.stops.filter(Boolean).length;
  const routeCities = state.steps.route?.detail?.split(" · ")[0]?.split(" → ") ?? [];

  const idle = state.status === "idle";

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* left: form or trace */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          {idle || state.status === "error" ? (
            <div className="rounded-2xl border border-line bg-panel p-5">
              <h1 className="mb-1 font-display text-xl font-bold">Plan a tour</h1>
              <p className="mb-5 text-sm text-muted">ROADIE reads Qloo&apos;s taste graph to find where your fans actually are.</p>
              <TourForm initial={state.request ?? initial} onSubmit={run} busy={false} />
              {state.status === "error" && (
                <div className="mt-4 rounded-lg border border-heat/30 bg-heat/5 p-3 text-sm text-heat">{state.error}</div>
              )}
            </div>
          ) : (
            <>
              <AgentTrace state={state} />
              {state.status === "done" && (
                <button onClick={reset} className="w-full rounded-xl border border-line py-2.5 text-sm hover:border-acid/50">
                  ← Plan another tour
                </button>
              )}
            </>
          )}
        </aside>

        {/* right: live canvas */}
        <section className="min-w-0">
          {idle && <IdleCanvas />}

          {state.status === "running" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-2xl font-bold tracking-tight">{state.artist?.name ?? "Resolving artist…"}</h2>
                {state.artist?.id && <Pill className="font-mono">{state.artist.id}</Pill>}
              </div>
              {state.persona && (
                <div className="rounded-2xl border border-acid/20 bg-acid/[0.04] p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-acid">Fan persona</div>
                  <div className="mt-1 font-display text-lg font-bold">{state.persona.headline}</div>
                  <p className="mt-1 text-sm text-text/80">{state.persona.summary}</p>
                </div>
              )}
              <div className="h-[360px] overflow-hidden rounded-2xl border border-line">
                <TourMap
                  center={region.center}
                  zoom={region.zoom}
                  heatPoints={state.market?.heatPoints}
                  cities={state.market?.cities}
                  stops={state.stops}
                  className="h-full w-full"
                />
              </div>
              <div className="grid gap-4">
                {(routeCities.length ? routeCities : Array.from({ length: 3 }, () => undefined)).map((city, i) => {
                  const stop = state.stops[i];
                  return stop ? (
                    <StopCard key={stop.city} stop={stop} index={i} kind={state.request?.kind ?? "music"} />
                  ) : (
                    <StopSkeleton key={city ?? i} city={city} index={i} />
                  );
                })}
              </div>
              <div className="text-center text-xs text-muted">{stopsPlanned ? `${stopsPlanned} of ${routeCities.length} stops planned` : "Gathering taste signals…"}</div>
            </div>
          )}

          {state.status === "done" && state.plan && <TourBook plan={state.plan} />}
          {state.status === "error" && (
            <div className="grid h-80 place-items-center rounded-2xl border border-dashed border-line text-center text-sm text-muted">
              <div>
                The agent hit a problem.
                <br />
                Adjust the brief on the left and try again.
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function IdleCanvas() {
  const steps = [
    ["01", "Taste fingerprint", "Qloo tags, demographics and cross-domain affinities (brands, films, podcasts) for the artist's fans."],
    ["02", "Affinity heatmap", "Where those fans concentrate geographically — not where the biggest cities are."],
    ["03", "Route + schedule", "Hottest distinct markets, ordered with a 2-opt TSP and spread across your date window."],
    ["04", "Per-city plan", "Venues, openers, dinner and after-party spots your fans already love — each with a Qloo ID."],
    ["05", "Promo + pitch", "City-tuned posts in the local language and a booking email that cites the affinity data."],
    ["06", "Critic", "The agent rejects anything not grounded in Qloo and flags constraint breaks."],
  ];
  return (
    <div className="grid-lines relative overflow-hidden rounded-2xl border border-line p-6 sm:p-8">
      <div className="mb-6 font-mono text-[11px] uppercase tracking-[0.2em] text-acid">What the agent will do</div>
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map(([n, t, d]) => (
          <div key={n} className="rounded-xl border border-line bg-panel/80 p-4 backdrop-blur">
            <div className="font-mono text-xs text-acid">{n}</div>
            <div className="mt-1 font-semibold">{t}</div>
            <div className="mt-1 text-sm text-muted">{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
