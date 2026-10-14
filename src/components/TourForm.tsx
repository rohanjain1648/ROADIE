"use client";

import { useRef, useState } from "react";
import type { TourRequest } from "@/lib/agent/types";
import { REGIONS, getRegion } from "@/lib/geo/cities";
import { cx } from "./ui";

interface Suggestion {
  id: string;
  name: string;
  popularity?: number;
  description?: string;
  mock?: boolean;
}

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function defaultDates() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1)).toISOString().slice(0, 10);
  return { startDate: start, endDate: addDays(start, 20) };
}

/** Fill a partial brief (e.g. from demo URL params) with sensible defaults. */
export function buildRequest(initial: Partial<TourRequest> = {}): TourRequest {
  const merged: TourRequest = {
    artist: "",
    kind: "music",
    region: "north-america",
    shows: 6,
    capacity: "club",
    language: "English",
    ...defaultDates(),
    ...initial,
  };
  const region = getRegion(merged.region);
  if (!region.languages.includes(merged.language)) merged.language = region.languages[0];
  return merged;
}

const label = "mb-1.5 block text-xs font-semibold text-text/70";
const field =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(21,19,31,0.03)] outline-none transition placeholder:text-muted/60 hover:border-acid/30 focus:border-acid focus:ring-4 focus:ring-acid/10";

const EXAMPLES: Record<"music" | "comedy", string[]> = {
  music: ["Phoebe Bridgers", "Khruangbin", "Big Thief"],
  comedy: ["Zakir Khan", "Hasan Minhaj", "Bo Burnham"],
};
const CAPACITIES: Array<[TourRequest["capacity"], string, string]> = [
  ["intimate", "Intimate", "<300"],
  ["club", "Club", "300–1.5k"],
  ["theatre", "Theatre", "1.5–5k"],
  ["arena", "Arena", "5k+"],
];

export function TourForm({
  initial,
  onSubmit,
  busy,
}: {
  initial?: Partial<TourRequest>;
  onSubmit: (req: TourRequest) => void;
  busy?: boolean;
}) {
  const [req, setReq] = useState<TourRequest>(() => buildRequest(initial));
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const region = getRegion(req.region);

  const set = <K extends keyof TourRequest>(k: K, v: TourRequest[K]) => setReq((r) => ({ ...r, [k]: v }));


  const lookup = (q: string) => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${req.kind === "comedy" ? "person" : "artist"}`);
        const json = await res.json();
        setSuggestions(json.results ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 280);
  };

  const windowDays = Math.round((new Date(req.endDate).getTime() - new Date(req.startDate).getTime()) / 86400000) + 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (req.artist.trim()) onSubmit(req);
      }}
      className="space-y-5"
    >
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-panel-2 p-1">
        {(["music", "comedy"] as const).map((k) => (
          <button
            type="button"
            key={k}
            onClick={() => set("kind", k)}
            aria-pressed={req.kind === k}
            className={cx("rounded-lg py-2 text-sm font-semibold capitalize transition", req.kind === k ? "bg-white text-acid shadow-[0_2px_8px_rgba(21,19,31,0.1)]" : "text-muted hover:text-text")}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="relative">
        <label className={label} htmlFor="artist">
          {req.kind === "comedy" ? "Comedian" : "Artist / band"}
        </label>
        <input
          id="artist"
          autoComplete="off"
          className={field}
          placeholder={req.kind === "comedy" ? "e.g. Zakir Khan" : "e.g. Phoebe Bridgers"}
          value={req.artist}
          onChange={(e) => {
            setReq((r) => ({ ...r, artist: e.target.value, artistId: undefined }));
            lookup(e.target.value);
          }}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          required
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-line bg-panel-2 shadow-2xl">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-acid/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setReq((r) => ({ ...r, artist: s.name, artistId: s.id }));
                    setOpen(false);
                  }}
                >
                  <span className="truncate">{s.name}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted">{s.mock ? "mock" : s.popularity !== undefined ? `pop ${s.popularity.toFixed(2)}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {req.artistId ? (
          <div className="mt-1.5 truncate font-mono text-[10px] text-acid">✓ Qloo entity {req.artistId}</div>
        ) : (
          !req.artist && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <span>Try:</span>
              {EXAMPLES[req.kind].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => {
                    setReq((r) => ({ ...r, artist: n, artistId: undefined }));
                    lookup(n);
                  }}
                  className="rounded-full border border-line bg-white px-2.5 py-1 font-medium text-text/80 transition hover:border-acid/50 hover:text-acid"
                >
                  {n}
                </button>
              ))}
            </div>
          )
        )}
      </div>

      <div>
        <label className={label} htmlFor="region">Region</label>
        <select
          id="region"
          className={field}
          value={req.region}
          onChange={(e) => {
            const next = getRegion(e.target.value);
            setReq((r) => ({ ...r, region: next.id, language: next.languages.includes(r.language) ? r.language : next.languages[0] }));
          }}
        >
          {REGIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="start">First show</label>
          <input id="start" type="date" className={field} value={req.startDate} onChange={(e) => set("startDate", e.target.value)} required />
        </div>
        <div>
          <label className={label} htmlFor="end">Last show</label>
          <input id="end" type="date" className={field} value={req.endDate} min={req.startDate} onChange={(e) => set("endDate", e.target.value)} required />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="shows">
          Shows: <span className="font-semibold text-acid">{req.shows}</span> <span className="font-normal text-muted">in a {windowDays}-day window</span>
        </label>
        <input
          id="shows"
          type="range"
          min={2}
          max={12}
          value={req.shows}
          onChange={(e) => set("shows", Number(e.target.value))}
          className="w-full accent-[#5b32f0]"
        />
      </div>

      <div>
        <span className={label}>Room size</span>
        <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Room size">
          {CAPACITIES.map(([id, name, range]) => (
            <button
              type="button"
              key={id}
              onClick={() => set("capacity", id)}
              aria-pressed={req.capacity === id}
              className={cx(
                "rounded-xl border px-1 py-2 text-center transition",
                req.capacity === id ? "border-acid bg-acid/[0.07] text-acid" : "border-line bg-white text-text/80 hover:border-acid/40",
              )}
            >
              <div className="text-[13px] font-semibold">{name}</div>
              <div className="text-[10px] text-muted">{range}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className={label} htmlFor="language">Promo language</label>
          <select id="language" className={field} value={req.language} onChange={(e) => set("language", e.target.value)}>
            {region.languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={label} htmlFor="notes">Notes for the agent <span className="font-normal text-muted">(optional)</span></label>
        <textarea
          id="notes"
          rows={2}
          maxLength={500}
          className={cx(field, "resize-none")}
          placeholder="e.g. new album is moodier; avoid cities we played last spring"
          value={req.notes ?? ""}
          onChange={(e) => set("notes", e.target.value || undefined)}
        />
      </div>

      <button
        disabled={busy || !req.artist.trim()}
        className="btn-primary group relative w-full rounded-xl py-3.5 font-display text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Agent running…" : "Plan my tour →"}
      </button>
    </form>
  );
}
