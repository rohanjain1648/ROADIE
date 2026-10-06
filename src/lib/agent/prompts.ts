import { z } from "zod";
import type { QDemographics, QEntity, QTag } from "../qloo/types";
import type { TourRequest } from "./types";

// Prompts + output schemas for every LLM step. The LLM never invents facts:
// it only *chooses among* and *writes about* Qloo-grounded candidates whose
// IDs we hand it, and the critic rejects any ID that wasn't in the list.

export const SYSTEM_TOUR_MANAGER = `You are ROADIE, a veteran tour manager and music/comedy marketer.
You make decisions ONLY from the Qloo taste-graph data you are given (entity IDs, affinity scores 0-1, taste tags, demographics).
Never invent venues, artists, brands or numbers. When you choose something you must return its exact ID from the candidate list.
Be concrete, specific and culturally fluent. No generic filler ("great music scene", "vibrant city").`;

const compactEntity = (e: QEntity) => ({
  id: e.id,
  name: e.name,
  affinity: e.affinity !== undefined ? Number(e.affinity.toFixed(2)) : undefined,
  rating: e.rating,
  price: e.priceLevel,
  about: e.description?.slice(0, 80),
  tags: e.tags.slice(0, 3).map((t) => t.name),
});

export function demographicsSummary(d: QDemographics | null): string {
  if (!d) return "unknown";
  const top = (rec: Record<string, number>) =>
    Object.entries(rec)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([k, v]) => `${k.replace(/_/g, " ")} (${v > 0 ? "+" : ""}${v.toFixed(2)})`)
      .join(", ");
  return `age over-index: ${top(d.age)}; gender over-index: ${top(d.gender)}`;
}

/* -------------------------------- persona -------------------------------- */

export const PersonaSchema = z.object({
  headline: z.string().min(3).max(140),
  summary: z.string().min(10).max(700),
  bullets: z.array(z.string().min(3).max(220)).min(2).max(6),
});
export type Persona = z.infer<typeof PersonaSchema>;

export function personaPrompt(args: {
  artist: string;
  kind: string;
  tags: QTag[];
  demographics: QDemographics | null;
  crossDomain: Record<string, QEntity[]>;
}) {
  const cross = Object.entries(args.crossDomain)
    .map(([type, list]) => `${type}: ${list.slice(0, 5).map((e) => e.name).join(", ")}`)
    .join("\n");
  return `Write the fan persona for ${args.kind === "comedy" ? "comedian" : "artist"} "${args.artist}".

Qloo taste tags (strongest first): ${args.tags.slice(0, 12).map((t) => t.name).join(", ")}
Demographics: ${demographicsSummary(args.demographics)}
What these fans ALSO love (Qloo cross-domain affinity):
${cross}

Return JSON: {"headline": "a punchy 6-12 word persona name", "summary": "2-3 sentences describing who these fans are, grounded in the data", "bullets": ["3-5 actionable insights for routing/marketing a tour, each citing a specific data point"]}`;
}

export function personaFallback(args: { artist: string; tags: QTag[]; crossDomain: Record<string, QEntity[]> }): Persona {
  const tags = args.tags.slice(0, 3).map((t) => t.name);
  const brands = args.crossDomain.brand?.slice(0, 2).map((b) => b.name) ?? [];
  return {
    headline: `${tags[0] ?? "Culturally curious"} loyalists`,
    summary: `Fans of ${args.artist} cluster around ${tags.join(", ") || "a distinct taste profile"}. Their cross-domain affinities point to where to find them offline.`,
    bullets: [
      tags.length ? `Lead creative with: ${tags.join(" · ")}` : "Lead creative with the artist's core sound",
      brands.length ? `Brand affinity: ${brands.join(", ")}` : "Brand affinity data unavailable",
      "Prioritise markets with the highest affinity heat, not the biggest population",
    ],
  };
}

/* ---------------------------------- stop ---------------------------------- */

export const StopSchema = z.object({
  venueId: z.string(),
  venueWhy: z.string().max(400),
  openerIds: z.array(z.string()).max(3).default([]),
  preShowId: z.string().nullish(),
  afterPartyId: z.string().nullish(),
  marketing: z.object({
    headline: z.string().max(140),
    copy: z.string().max(600),
    hashtags: z.array(z.string().max(40)).max(6).default([]),
  }),
  localMaterial: z.array(z.string().max(240)).max(5).default([]),
  pitch: z.object({ subject: z.string().max(160), body: z.string().max(1400) }),
});
export type StopOut = z.infer<typeof StopSchema>;

export function stopPrompt(args: {
  req: TourRequest;
  artist: QEntity;
  persona: Persona;
  city: string;
  date: string;
  heat: number;
  tags: QTag[];
  venues: QEntity[];
  openers: QEntity[];
  food: QEntity[];
  bars: QEntity[];
}) {
  const { req } = args;
  const comedy = req.kind === "comedy";
  return `Plan the ${args.city} stop (${args.date}) of ${args.artist.name}'s tour.
Capacity target: ${req.capacity}. Market heat (Qloo affinity, relative 0-100): ${args.heat}.
Fan persona: ${args.persona.headline} — ${args.persona.summary}
Fan taste tags: ${args.tags.slice(0, 10).map((t) => t.name).join(", ")}
${req.notes ? `Artist notes: ${req.notes}` : ""}

VENUE candidates (Qloo places loved by these fans in ${args.city}):
${JSON.stringify(args.venues.slice(0, 6).map(compactEntity))}
${comedy ? "SUPPORT ACT" : "OPENER"} candidates (loved by ${args.city} fans of this artist):
${JSON.stringify(args.openers.slice(0, 5).map(compactEntity))}
PRE-SHOW dining candidates:
${JSON.stringify(args.food.slice(0, 4).map(compactEntity))}
AFTER-PARTY bar candidates:
${JSON.stringify(args.bars.slice(0, 4).map(compactEntity))}

Return JSON:
{
 "venueId": "<id from VENUE candidates — best taste fit for a ${req.capacity} show>",
 "venueWhy": "1-2 sentences citing affinity/tags",
 "openerIds": ["up to 2 ids from ${comedy ? "SUPPORT ACT" : "OPENER"} candidates"],
 "preShowId": "<id from PRE-SHOW or null>",
 "afterPartyId": "<id from AFTER-PARTY or null>",
 "marketing": {"headline": "...", "copy": "2-3 sentence promo post for ${args.city}", "hashtags": ["..."]},
 "localMaterial": ${comedy ? `["3-4 short observational premises (not full jokes) that connect ${args.city}'s local culture to this audience's taste tags"]` : "[]"},
 "pitch": {"subject": "...", "body": "<=120 word email to the venue's booker, cite the fan-affinity data"}
}
Write marketing.headline, marketing.copy and hashtags in ${req.language}${/hinglish/i.test(req.language) ? " (natural Hindi-English code-mixing in Latin script)" : ""}. Everything else in English.`;
}

/* --------------------------------- brands --------------------------------- */

export const BrandPitchSchema = z.object({
  pitches: z.array(z.object({ brandId: z.string(), pitch: z.string().max(400) })).max(5),
});

export function brandPrompt(artist: string, brands: Array<{ entity: QEntity; sharedThemes: string[] }>) {
  return `For ${artist}'s tour, write a one-paragraph sponsorship angle for each brand below. Use the shared taste themes (from Qloo's compare analysis) and the affinity score. Be specific about an activation idea at the shows.
${JSON.stringify(brands.map((b) => ({ id: b.entity.id, name: b.entity.name, affinity: b.entity.affinity, sharedThemes: b.sharedThemes })))}
Return JSON: {"pitches": [{"brandId": "<id>", "pitch": "..."}]}`;
}
