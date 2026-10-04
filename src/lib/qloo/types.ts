export type EntityType =
  | "artist"
  | "book"
  | "brand"
  | "destination"
  | "movie"
  | "person"
  | "place"
  | "podcast"
  | "tv_show"
  | "video_game";

export const ENTITY_TYPES: EntityType[] = [
  "artist",
  "book",
  "brand",
  "destination",
  "movie",
  "person",
  "place",
  "podcast",
  "tv_show",
  "video_game",
];

export const urn = (t: EntityType) => `urn:entity:${t}`;

export interface QTag {
  id: string;
  name: string;
  type?: string;
  affinity?: number;
}

export interface QEntity {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  affinity?: number;
  popularity?: number;
  image?: string;
  description?: string;
  address?: string;
  lat?: number;
  lon?: number;
  priceLevel?: number;
  rating?: number;
  website?: string;
  tags: QTag[];
  mock?: boolean;
}

export interface QDemographics {
  age: Record<string, number>;
  gender: Record<string, number>;
}

export interface QHeatPoint {
  lat: number;
  lon: number;
  affinity: number;
  popularity?: number;
}

export interface QAudience {
  id: string;
  name: string;
  parentType?: string;
  affinity?: number;
}

/** One instrumented Qloo HTTP call — streamed into the Agent Trace panel. */
export interface QCall {
  id: string;
  endpoint: string;
  params: Record<string, string>;
  ms: number;
  status: "ok" | "cached" | "mock" | "error" | "rejected";
  count: number;
  error?: string;
}

export type QParams = Record<string, string | number | boolean | undefined | null>;
