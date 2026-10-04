import { z } from "zod";
import type { QAudience, QCall, QDemographics, QEntity, QHeatPoint, QTag } from "../qloo/types";

export const TourRequestSchema = z.object({
  artist: z.string().trim().min(1).max(120),
  artistId: z.string().max(200).optional(),
  kind: z.enum(["music", "comedy"]).default("music"),
  region: z.string().default("north-america"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shows: z.number().int().min(2).max(12).default(6),
  capacity: z.enum(["intimate", "club", "theatre", "arena"]).default("club"),
  language: z.string().max(40).default("English"),
  notes: z.string().max(500).optional(),
});
export type TourRequest = z.infer<typeof TourRequestSchema>;

export interface MarketCity {
  name: string;
  country: string;
  lat: number;
  lon: number;
  heat: number; // 0..100, relative within region
  rawAffinity: number;
  points: number;
  pop: number;
}

export interface Stop {
  city: string;
  country: string;
  lat: number;
  lon: number;
  date: string;
  heat: number;
  venue: { pick: QEntity | null; why: string; alternates: QEntity[] };
  openers: QEntity[];
  hospitality: { preShow: QEntity | null; afterParty: QEntity | null };
  marketing: { headline: string; copy: string; hashtags: string[]; language: string };
  localMaterial: string[];
  venuePitch: { subject: string; body: string };
  llm: "llm" | "fallback";
}

export interface BrandPartner {
  entity: QEntity;
  sharedThemes: string[];
  pitch: string;
}

export interface CriticCheck {
  label: string;
  pass: boolean;
  detail: string;
}

export interface TourPlan {
  id: string;
  createdAt: string;
  request: TourRequest;
  mode: { qloo: string; llm: string; llmModel: string };
  artist: QEntity;
  persona: { headline: string; summary: string; bullets: string[]; source: "llm" | "fallback" };
  fingerprint: {
    tags: QTag[];
    demographics: QDemographics | null;
    crossDomain: Partial<Record<"brand" | "movie" | "tv_show" | "podcast" | "book", QEntity[]>>;
  };
  market: { cities: MarketCity[]; heatPoints: QHeatPoint[]; method: "heatmap" | "venue-affinity" };
  route: { totalKm: number };
  stops: Stop[];
  brands: BrandPartner[];
  audiences: QAudience[];
  momentum: Array<{ date: string; popularity: number }>;
  critic: { checks: CriticCheck[]; fixes: string[] };
  stats: { qlooCalls: number; cachedCalls: number; ms: number; groundedRecs: number };
}

export type StepId =
  | "resolve"
  | "fingerprint"
  | "persona"
  | "market"
  | "route"
  | "cities"
  | "brands"
  | "audiences"
  | "critic";

export const STEPS: Array<{ id: StepId; label: string }> = [
  { id: "resolve", label: "Resolve artist in Qloo's graph" },
  { id: "fingerprint", label: "Build cross-domain taste fingerprint" },
  { id: "persona", label: "Synthesize fan persona" },
  { id: "market", label: "Scan affinity heatmap for markets" },
  { id: "route", label: "Optimize route & schedule" },
  { id: "cities", label: "Plan each stop (venues, openers, hospitality, promo)" },
  { id: "brands", label: "Score brand partners by taste overlap" },
  { id: "audiences", label: "Find ad audiences" },
  { id: "critic", label: "Critic: verify grounding & constraints" },
];

export type AgentEvent =
  | { type: "step"; id: StepId; status: "running" | "done" | "error"; detail?: string }
  | { type: "call"; call: QCall }
  | { type: "thought"; text: string }
  | { type: "partial"; key: keyof TourPlan | "stop"; data: unknown }
  | { type: "done"; plan: TourPlan }
  | { type: "error"; message: string };
