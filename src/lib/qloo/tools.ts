import { QlooClient } from "./client";
import type { EntityType, QAudience, QDemographics, QEntity, QHeatPoint, QTag } from "./types";
import { urn } from "./types";

// High-level, typed Qloo "tools". These are shared by the tour pipeline, the
// tool-calling chat agent and the MCP server, so every surface speaks to Qloo
// the same validated way.

/* ------------------------------ normalisers ------------------------------ */

type Raw = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown) => (typeof v === "string" && v.length ? v : undefined);
const obj = (v: unknown): Raw => (v && typeof v === "object" ? (v as Raw) : {});

export function normalizeTag(raw: Raw): QTag {
  return {
    id: str(raw.id) ?? str(raw.tag_id) ?? str(raw.entity_id) ?? "",
    name: str(raw.name) ?? str(raw.tag_value) ?? "",
    type: str(raw.type) ?? str(raw.subtype),
    affinity: num(obj(raw.query).affinity),
  };
}

export function normalizeEntity(raw: Raw): QEntity {
  const props = obj(raw.properties);
  const geocode = obj(props.geocode);
  const location = obj(raw.location);
  const image = obj(props.image);
  const types = Array.isArray(raw.types) ? (raw.types as string[]) : [];
  return {
    id: str(raw.entity_id) ?? str(raw.id) ?? "",
    name: str(raw.name) ?? "Unknown",
    type: str(raw.type) ?? types[0] ?? "",
    subtype: str(raw.subtype),
    affinity: num(obj(raw.query).affinity),
    popularity: num(raw.popularity),
    image: str(image.url) ?? str(props.image_url),
    description: str(props.short_description) ?? str(props.description) ?? str(raw.disambiguation),
    address: str(props.address),
    lat: num(location.lat) ?? num(location.latitude) ?? num(geocode.latitude),
    lon: num(location.lon) ?? num(location.longitude) ?? num(geocode.longitude),
    priceLevel: num(props.price_level),
    rating: num(props.business_rating),
    website: str(props.website),
    tags: Array.isArray(raw.tags) ? (raw.tags as Raw[]).slice(0, 8).map(normalizeTag) : [],
    mock: raw.mock === true || undefined,
  };
}

function resultsArray(json: unknown, ...keys: string[]): Raw[] {
  const res = obj(json).results;
  if (Array.isArray(res)) return res as Raw[];
  const o = obj(res);
  for (const k of keys) if (Array.isArray(o[k])) return o[k] as Raw[];
  return [];
}

/* --------------------------------- tools --------------------------------- */

export class QlooTools {
  constructor(public readonly client: QlooClient = new QlooClient()) {}

  /** Look up entities by name → Qloo entity IDs. */
  async searchEntities(query: string, type: EntityType = "artist", take = 5): Promise<QEntity[]> {
    const json = await this.client.get("/search", { query, types: urn(type), take });
    return resultsArray(json, "entities").map(normalizeEntity);
  }

  /** Find valid tag IDs (genres, cuisines, venue categories…). */
  async searchTags(query: string, take = 5): Promise<QTag[]> {
    const json = await this.client.get("/v2/tags", { "filter.query": query, take });
    return resultsArray(json, "tags").map(normalizeTag);
  }

  /** The taste fingerprint: tags most associated with fans of these entities. */
  async tasteTags(entityIds: string[], take = 14): Promise<QTag[]> {
    const json = await this.client.get("/v2/insights", {
      "filter.type": "urn:tag",
      "signal.interests.entities": entityIds.join(","),
      take,
    });
    return resultsArray(json, "tags").map(normalizeTag).filter((t) => t.name);
  }

  /** Age / gender skew of the audience (positive = over-indexes). */
  async demographics(entityIds: string[]): Promise<QDemographics | null> {
    const json = await this.client.get("/v2/insights", {
      "filter.type": "urn:demographics",
      "signal.interests.entities": entityIds.join(","),
    });
    const first = resultsArray(json, "demographics")[0];
    if (!first) return null;
    const q = obj(first.query);
    const age = obj(q.age) as Record<string, number>;
    const gender = obj(q.gender) as Record<string, number>;
    if (!Object.keys(age).length && !Object.keys(gender).length) return null;
    return { age, gender };
  }

  /** Geographic affinity for fans of these entities inside a location. */
  async heatmap(entityIds: string[], locationQuery: string): Promise<QHeatPoint[]> {
    const json = await this.client.get("/v2/insights", {
      "filter.type": "urn:heatmap",
      "filter.location.query": locationQuery,
      "signal.interests.entities": entityIds.join(","),
    });
    return resultsArray(json, "heatmap")
      .map((p) => {
        const loc = obj(p.location);
        const q = obj(p.query);
        return {
          lat: num(loc.latitude) ?? num(loc.lat) ?? NaN,
          lon: num(loc.longitude) ?? num(loc.lon) ?? NaN,
          affinity: num(q.affinity) ?? num(q.affinity_rank) ?? 0,
          popularity: num(q.popularity),
        };
      })
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
  }

  /**
   * Cross-domain recommendations: what else do these fans love?
   * `location` narrows places to a city; `tagIds` narrows to a category.
   */
  async recommend(opts: {
    type: EntityType;
    entityIds?: string[];
    tagIds?: string[];
    location?: string;
    radiusMeters?: number;
    filterTagIds?: string[];
    excludeIds?: string[];
    take?: number;
  }): Promise<QEntity[]> {
    const isPlace = opts.type === "place" || opts.type === "destination";
    const json = await this.client.get("/v2/insights", {
      "filter.type": urn(opts.type),
      "signal.interests.entities": opts.entityIds?.join(","),
      "signal.interests.tags": opts.tagIds?.join(","),
      // Non-place types can't be *filtered* by location — bias the signal instead.
      "filter.location.query": isPlace ? opts.location : undefined,
      "filter.location.radius": isPlace && opts.location ? opts.radiusMeters : undefined,
      "signal.location.query": !isPlace ? opts.location : undefined,
      "filter.tags": opts.filterTagIds?.join(","),
      "filter.exclude.entities": opts.excludeIds?.join(","),
      take: opts.take ?? 8,
    });
    return resultsArray(json, "entities").map(normalizeEntity);
  }

  /** Audience segments (for ad targeting) that over-index with these fans. */
  async audiences(entityIds: string[], parentType?: string, take = 8): Promise<QAudience[]> {
    const json = await this.client.get("/v2/insights", {
      "filter.type": "urn:audience",
      "signal.interests.entities": entityIds.join(","),
      "filter.parents.types": parentType,
      take,
    });
    return resultsArray(json, "entities", "audiences").map((a) => {
      const parents = Array.isArray(a.parents) ? (a.parents as Raw[]) : [];
      return {
        id: str(a.entity_id) ?? str(a.id) ?? "",
        name: str(a.name) ?? "",
        parentType: str(obj(parents[0]).type) ?? parentType,
        affinity: num(obj(a.query).affinity),
      };
    });
  }

  /** Compare two groups of entities → the taste themes they share. */
  async compare(aIds: string[], bIds: string[], take = 8): Promise<QTag[]> {
    const json = await this.client.get("/v2/insights/compare", {
      "a.signal.interests.entities": aIds.join(","),
      "b.signal.interests.entities": bIds.join(","),
      take,
    });
    return resultsArray(json, "tags", "entities").map(normalizeTag).filter((t) => t.name);
  }

  /** Popularity time-series for an entity (momentum check). */
  async trending(entityId: string, type: EntityType = "artist"): Promise<Array<{ date: string; popularity: number }>> {
    const json = await this.client.get("/v2/trending", {
      "signal.interests.entities": entityId,
      "filter.type": urn(type),
    });
    return resultsArray(json, "trending", "entities")
      .map((p) => ({
        date: str(p.date) ?? str(p.week) ?? "",
        popularity: num(p.popularity) ?? num(obj(p.query).popularity) ?? 0,
      }))
      .filter((p) => p.date);
  }
}
