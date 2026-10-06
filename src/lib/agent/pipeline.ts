import { randomUUID } from "crypto";
import { kvSet } from "../cache";
import { runtimeMode } from "../env";
import { getRegion, type City } from "../geo/cities";
import { haversineKm, orderRoute, scheduleDates, totalKm } from "../geo/route";
import { chatJSON } from "../llm";
import { QlooClient } from "../qloo/client";
import { QlooTools } from "../qloo/tools";
import type { EntityType, QEntity, QHeatPoint, QTag } from "../qloo/types";
import {
  BrandPitchSchema,
  PersonaSchema,
  StopSchema,
  SYSTEM_TOUR_MANAGER,
  brandPrompt,
  personaFallback,
  personaPrompt,
  stopPrompt,
  type Persona,
  type StopOut,
} from "./prompts";
import type { AgentEvent, BrandPartner, CriticCheck, MarketCity, Stop, StepId, TourPlan, TourRequest } from "./types";

// The ROADIE agent: plan → gather (Qloo, in parallel) → decide (LLM over
// grounded candidates) → verify (critic). Every event is streamed to the UI.

type Emit = (e: AgentEvent) => void;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

const settled = <T,>(r: PromiseSettledResult<T>, fallback: T): T => (r.status === "fulfilled" ? r.value : fallback);
const byAffinity = (a: QEntity, b: QEntity) => (b.affinity ?? 0) - (a.affinity ?? 0);

export async function runTourAgent(req: TourRequest, emit: Emit): Promise<TourPlan> {
  const started = Date.now();
  let qlooCalls = 0;
  let cachedCalls = 0;
  const client = new QlooClient({
    onCall: (call) => {
      qlooCalls++;
      if (call.status === "cached") cachedCalls++;
      emit({ type: "call", call });
    },
  });
  const q = new QlooTools(client);
  const region = getRegion(req.region);
  const fixes: string[] = [];

  async function step<T>(id: StepId, fn: () => Promise<T>, detail?: (r: T) => string): Promise<T> {
    emit({ type: "step", id, status: "running" });
    try {
      const r = await fn();
      emit({ type: "step", id, status: "done", detail: detail?.(r) });
      return r;
    } catch (err) {
      emit({ type: "step", id, status: "error", detail: err instanceof Error ? err.message : String(err) });
      throw err;
    }
  }
  const think = (text: string) => emit({ type: "thought", text });

  /* 1 ─ resolve ─────────────────────────────────────────────────────────── */
  const artist = await step(
    "resolve",
    async () => {
      const types: EntityType[] = req.kind === "comedy" ? ["person", "artist"] : ["artist"];
      const candidates: QEntity[] = [];
      for (const t of types) {
        const found = await q.searchEntities(req.artist, t, 5).catch(() => []);
        candidates.push(...found);
        if (found.length) break;
      }
      let chosen: QEntity | undefined =
        (req.artistId ? candidates.find((c) => c.id === req.artistId) : undefined) ||
        candidates.find((c) => c.name.toLowerCase() === req.artist.toLowerCase()) ||
        candidates[0];
      // Qloo often holds several entities with the same name (stubs with no taste data). Prefer the one with signal.
      const wanted = req.artist.toLowerCase();
      const dupes = candidates.filter((c) => c.name.toLowerCase().includes(wanted)).slice(0, 4);
      if (!req.artistId && dupes.length > 1) {
        const richness = await Promise.all(dupes.map((c) => q.tasteTags([c.id], 8).then((t) => t.length).catch(() => 0)));
        const best = richness.indexOf(Math.max(...richness));
        if (richness[best] > 0) chosen = dupes[best];
      }
      if (chosen) return chosen;
      if (req.artistId) return { id: req.artistId, name: req.artist, type: `urn:entity:${types[0]}`, tags: [] } as QEntity;
      throw new Error(`"${req.artist}" isn't in Qloo's taste graph yet — try a different spelling or a better-known act.`);
    },
    (a) => `${a.name} → ${a.id}`,
  );
  const ids = [artist.id];
  const performerType: EntityType = artist.type.includes("person") ? "person" : "artist";
  emit({ type: "partial", key: "artist", data: artist });

  /* 2 ─ fingerprint (+ tag lookups, momentum) ────────────────────────────── */
  const crossTypes = ["brand", "movie", "tv_show", "podcast", "book"] as const;
  const [fp, tagIds, momentum] = await step(
    "fingerprint",
    async () => {
      const [tagsR, demoR, ...crossR] = await Promise.allSettled([
        q.tasteTags(ids, 16),
        q.demographics(ids),
        ...crossTypes.map((t) => q.recommend({ type: t, entityIds: ids, take: 6 })),
      ]);
      const crossDomain: TourPlan["fingerprint"]["crossDomain"] = {};
      crossTypes.forEach((t, i) => (crossDomain[t] = settled(crossR[i], [] as QEntity[])));
      const fingerprint = { tags: settled(tagsR, [] as QTag[]), demographics: settled(demoR, null), crossDomain };

      const firstTag = async (query: string) => (await q.searchTags(query, 3).catch(() => []))[0]?.id;
      const [venueTag, foodTag, barTag] = await Promise.all([
        firstTag(req.kind === "comedy" ? "comedy club" : "live music venue"),
        firstTag("restaurant"),
        firstTag("bar"),
      ]);
      const trend = await q.trending(artist.id, performerType).catch(() => []);
      return [fingerprint, { venueTag, foodTag, barTag }, trend] as const;
    },
    ([f]) =>
      `${f.tags.length} taste tags · ${Object.values(f.crossDomain).reduce((n, l) => n + (l?.length ?? 0), 0)} cross-domain affinities`,
  );
  emit({ type: "partial", key: "fingerprint", data: fp });
  if (fp.tags.length) think(`Fans over-index on ${fp.tags.slice(0, 4).map((t) => t.name).join(", ")}.`);

  /* 3 ─ persona ─────────────────────────────────────────────────────────── */
  const crossForPrompt = Object.fromEntries(Object.entries(fp.crossDomain).map(([k, v]) => [k, v ?? []]));
  const persona = await step(
    "persona",
    async () => {
      const { data, source } = await chatJSON<Persona>({
        system: SYSTEM_TOUR_MANAGER,
        user: personaPrompt({ artist: artist.name, kind: req.kind, tags: fp.tags, demographics: fp.demographics, crossDomain: crossForPrompt }),
        schema: PersonaSchema,
        fallback: () => personaFallback({ artist: artist.name, tags: fp.tags, crossDomain: crossForPrompt }),
      });
      return { ...data, source };
    },
    (p) => p.headline,
  );
  emit({ type: "partial", key: "persona", data: persona });

  /* 4 ─ market scan ─────────────────────────────────────────────────────── */
  const venueQuery = (city: string) => ({
    type: "place" as const,
    entityIds: ids,
    location: city,
    filterTagIds: tagIds.venueTag ? [tagIds.venueTag] : undefined,
    take: 8,
  });

  const market = await step(
    "market",
    async () => {
      const heat = await Promise.allSettled(region.heatmapQueries.map((loc) => q.heatmap(ids, loc)));
      const points: QHeatPoint[] = heat.flatMap((r) => settled(r, [] as QHeatPoint[]));
      let method: "heatmap" | "venue-affinity" = "heatmap";
      let scored: Array<{ city: City; raw: number; points: number }>;

      if (points.length) {
        scored = region.cities.map((city) => {
          const near = points.filter((p) => haversineKm(city, p) <= 80).map((p) => p.affinity).sort((a, b) => b - a);
          if (!near.length) return { city, raw: 0, points: 0 };
          const top3 = near.slice(0, 3);
          const raw = near[0] * 0.6 + (top3.reduce((a, b) => a + b, 0) / top3.length) * 0.4;
          return { city, raw, points: near.length };
        });
      } else {
        // Fallback: how strongly does each city's venue scene align with these fans?
        method = "venue-affinity";
        think("Heatmap returned no points for this region — falling back to venue-affinity scoring.");
        const pool = [...region.cities].sort((a, b) => b.pop - a.pop).slice(0, 20);
        scored = await mapLimit(pool, 6, async (city) => {
          const venues = await q.recommend(venueQuery(city.name)).catch(() => []);
          const affs = venues.map((v) => v.affinity ?? 0).filter((a) => a > 0);
          const raw = affs.length ? affs.reduce((a, b) => a + b, 0) / affs.length : 0;
          return { city, raw, points: venues.length };
        });
      }

      const maxRaw = Math.max(...scored.map((s) => s.raw), 1e-9);
      const maxLogPop = Math.max(...scored.map((s) => Math.log1p(s.city.pop)));
      const cities: MarketCity[] = scored
        .map((s) => {
          const heatScore = (s.raw / maxRaw) * 100;
          return {
            name: s.city.name,
            country: s.city.country,
            lat: s.city.lat,
            lon: s.city.lon,
            pop: s.city.pop,
            rawAffinity: Number(s.raw.toFixed(3)),
            points: s.points,
            // 85% taste, 15% market size — affinity leads, population breaks ties.
            heat: Math.round(heatScore * 0.85 + (Math.log1p(s.city.pop) / maxLogPop) * 15),
          };
        })
        .sort((a, b) => b.heat - a.heat);
      return { cities, heatPoints: points, method };
    },
    (m) => `${m.method === "heatmap" ? `${m.heatPoints.length} heat points` : "venue-affinity fallback"} · top: ${m.cities.slice(0, 3).map((c) => `${c.name} ${c.heat}`).join(", ")}`,
  );
  emit({ type: "partial", key: "market", data: market });

  /* 5 ─ route ───────────────────────────────────────────────────────────── */
  // Pick the hottest markets, skipping near-duplicates (e.g. Delhi + Gurugram share an audience).
  const chosen: MarketCity[] = [];
  for (const c of market.cities) {
    if (chosen.length >= req.shows) break;
    if (c.heat <= 0) continue;
    if (chosen.some((x) => haversineKm(x, c) < 60)) continue;
    chosen.push(c);
  }
  if (chosen.length < 2) throw new Error("Not enough affinity data in this region to build a route. Try another region.");
  const [ordered, dates] = await step(
    "route",
    async () => {
      const path = orderRoute(chosen);
      return [path, scheduleDates(path, req.startDate, req.endDate)] as const;
    },
    ([p]) => `${p.map((c) => c.name).join(" → ")} · ${totalKm(p).toLocaleString()} km`,
  );
  think(`Skipping big-but-cold markets like ${market.cities.filter((c) => !chosen.includes(c)).sort((a, b) => b.pop - a.pop)[0]?.name ?? "—"}; affinity beats population.`);

  /* 6 ─ per-city planning ───────────────────────────────────────────────── */
  const stops = await step(
    "cities",
    () =>
      mapLimit(ordered, 3, async (city, i): Promise<Stop> => {
        const [venuesR, openersR, foodR, barsR] = await Promise.allSettled([
          q.recommend(venueQuery(city.name)).then(async (v) =>
            v.length || !tagIds.venueTag ? v : q.recommend({ ...venueQuery(city.name), filterTagIds: undefined }),
          ),
          q.recommend({ type: performerType, entityIds: ids, location: city.name, excludeIds: ids, take: 6 }),
          q.recommend({ type: "place", entityIds: ids, location: city.name, filterTagIds: tagIds.foodTag ? [tagIds.foodTag] : undefined, take: 5 }),
          q.recommend({ type: "place", entityIds: ids, location: city.name, filterTagIds: tagIds.barTag ? [tagIds.barTag] : undefined, take: 5 }),
        ]);
        const venues = settled(venuesR, [] as QEntity[]).sort(byAffinity);
        const openers = settled(openersR, [] as QEntity[]).filter((o) => o.id !== artist.id).sort(byAffinity);
        const food = settled(foodR, [] as QEntity[]).sort(byAffinity);
        const venueIds = new Set(venues.map((v) => v.id));
        const bars = settled(barsR, [] as QEntity[]).filter((b) => !venueIds.has(b.id)).sort(byAffinity);

        const fallback = (): StopOut => ({
          venueId: venues[0]?.id ?? "",
          venueWhy: venues[0] ? `Highest Qloo affinity (${(venues[0].affinity ?? 0).toFixed(2)}) with ${artist.name}'s fans in ${city.name}.` : "No venue data.",
          openerIds: openers.slice(0, 2).map((o) => o.id),
          preShowId: food[0]?.id ?? null,
          afterPartyId: bars[0]?.id ?? null,
          marketing: {
            headline: `${artist.name} — live in ${city.name}`,
            copy: `${city.name}, ${dates[i]}. ${persona.headline}: this one's for you.`,
            hashtags: [`#${artist.name.replace(/\W/g, "")}`, `#${city.name.replace(/\W/g, "")}`],
          },
          localMaterial: [],
          pitch: {
            subject: `Hold request: ${artist.name}, ${dates[i]}`,
            body: `Hi — we're routing ${artist.name} through ${city.name} on ${dates[i]}. Qloo's taste graph ranks your room among the best fits for this audience. Can we discuss a hold?`,
          },
        });

        const { data, source } = await chatJSON<StopOut>({
          system: SYSTEM_TOUR_MANAGER,
          user: stopPrompt({ req, artist, persona, city: city.name, date: dates[i], heat: city.heat, tags: fp.tags, venues, openers, food, bars }),
          schema: StopSchema,
          fallback,
          temperature: 0.7,
        });

        // ── grounding guard: every chosen ID must come from the candidate set
        const find = (list: QEntity[], id: string | null | undefined, label: string, fb: QEntity | null) => {
          if (!id) return fb;
          const hit = list.find((e) => e.id === id);
          if (!hit) {
            fixes.push(`${city.name}: LLM ${label} id "${id.slice(0, 24)}" not in Qloo candidates → replaced with top-affinity pick`);
            return fb;
          }
          return hit;
        };
        const venue = find(venues, data.venueId, "venue", venues[0] ?? null);
        const pickedOpeners = data.openerIds
          .map((id) => find(openers, id, "opener", null))
          .filter((o): o is QEntity => Boolean(o));
        const stop: Stop = {
          city: city.name,
          country: city.country,
          lat: city.lat,
          lon: city.lon,
          date: dates[i],
          heat: city.heat,
          venue: { pick: venue, why: data.venueWhy, alternates: venues.filter((v) => v.id !== venue?.id).slice(0, 3) },
          openers: pickedOpeners.length ? pickedOpeners : openers.slice(0, 2),
          hospitality: {
            preShow: find(food, data.preShowId, "pre-show", food[0] ?? null),
            afterParty: find(bars, data.afterPartyId, "after-party", bars[0] ?? null),
          },
          marketing: { ...data.marketing, language: req.language },
          localMaterial: req.kind === "comedy" ? data.localMaterial : [],
          venuePitch: data.pitch,
          llm: source,
        };
        emit({ type: "partial", key: "stop", data: { index: i, stop } });
        return stop;
      }),
    (s) => `${s.length} stops planned · ${s.filter((x) => x.llm === "llm").length} LLM-synthesized`,
  );

  /* 7 ─ brands ──────────────────────────────────────────────────────────── */
  const brands = await step(
    "brands",
    async (): Promise<BrandPartner[]> => {
      const top = (fp.crossDomain.brand ?? []).slice(0, 3);
      if (!top.length) return [];
      const compared = await Promise.allSettled(top.map((b) => q.compare(ids, [b.id], 6)));
      const withThemes = top.map((entity, i) => ({
        entity,
        sharedThemes: settled(compared[i], [] as QTag[]).slice(0, 4).map((t) => t.name),
      }));
      const { data } = await chatJSON({
        system: SYSTEM_TOUR_MANAGER,
        user: brandPrompt(artist.name, withThemes),
        schema: BrandPitchSchema,
        fallback: () => ({
          pitches: withThemes.map((b) => ({
            brandId: b.entity.id,
            pitch: `${b.entity.name} over-indexes with this audience (affinity ${(b.entity.affinity ?? 0).toFixed(2)})${b.sharedThemes.length ? `, sharing ${b.sharedThemes.join(", ")}` : ""}. Activation: co-branded merch drop at each show.`,
          })),
        }),
      });
      return withThemes.map((b) => ({ ...b, pitch: data.pitches.find((p) => p.brandId === b.entity.id)?.pitch ?? "" }));
    },
    (b) => (b.length ? b.map((x) => x.entity.name).join(", ") : "no brand data"),
  );
  emit({ type: "partial", key: "brands", data: brands });

  /* 8 ─ audiences ───────────────────────────────────────────────────────── */
  const audiences = await step(
    "audiences",
    () => q.audiences(ids, undefined, 8).catch(() => []),
    (a) => `${a.length} segments`,
  );

  /* 9 ─ critic ──────────────────────────────────────────────────────────── */
  const plan = await step(
    "critic",
    async () => {
      const recs = stops.flatMap((s) => [s.venue.pick, ...s.openers, s.hospitality.preShow, s.hospitality.afterParty]).filter(Boolean) as QEntity[];
      const grounded = recs.filter((r) => r.id).length;
      const cityNames = stops.map((s) => s.city);
      const lateDates = stops.filter((s) => s.date > req.endDate);
      const cold = stops.filter((s) => s.heat < 25);
      const checks: CriticCheck[] = [
        { label: "Every recommendation maps to a Qloo entity ID", pass: grounded === recs.length, detail: `${grounded}/${recs.length} grounded` },
        { label: "Every LLM choice came from the Qloo candidate set", pass: fixes.length === 0, detail: fixes.length ? `${fixes.length} auto-repaired` : "no repairs needed" },
        { label: "Shows fit inside the date window", pass: lateDates.length === 0, detail: lateDates.length ? `${lateDates.length} show(s) spill past ${req.endDate} — widen the window or cut shows` : `${req.startDate} → ${req.endDate}` },
        { label: "No duplicate markets", pass: new Set(cityNames).size === cityNames.length, detail: `${cityNames.length} unique cities` },
        { label: "No cold markets (heat ≥ 25)", pass: cold.length === 0, detail: cold.length ? `low heat: ${cold.map((c) => c.city).join(", ")}` : "all markets warm" },
        { label: "Every stop has a venue", pass: stops.every((s) => s.venue.pick), detail: `${stops.filter((s) => s.venue.pick).length}/${stops.length}` },
      ];
      const mode = runtimeMode();
      const result: TourPlan = {
        id: randomUUID().slice(0, 8),
        createdAt: new Date().toISOString(),
        request: req,
        mode: { qloo: mode.qloo, llm: mode.llm, llmModel: mode.llmModel },
        artist,
        persona,
        fingerprint: fp,
        market,
        route: { totalKm: totalKm(ordered) },
        stops,
        brands,
        audiences,
        momentum,
        critic: { checks, fixes },
        stats: { qlooCalls, cachedCalls, ms: Date.now() - started, groundedRecs: grounded },
      };
      return result;
    },
    (p) => `${p.critic.checks.filter((c) => c.pass).length}/${p.critic.checks.length} checks passed`,
  );

  await kvSet(`tour:${plan.id}`, plan, 60 * 60 * 24 * 30);
  return plan;
}
