import { z } from "zod";
import { REGIONS, getRegion } from "../geo/cities";
import { haversineKm } from "../geo/route";
import { QlooTools } from "../qloo/tools";
import { ENTITY_TYPES, type EntityType } from "../qloo/types";

// Agent-facing Qloo tools, defined once and exposed to BOTH the in-app
// tool-calling chat agent (OpenAI/Groq function calling) and the MCP server
// (so Claude Desktop, Cursor, ChatGPT etc. can use ROADIE's taste tools).

const entityType = z.enum(ENTITY_TYPES as [EntityType, ...EntityType[]]);
const ids = z.array(z.string()).min(1).max(5);

export const TOOL_DEFS = {
  search_entity: {
    description: "Find Qloo entity IDs by name (artists, places, brands, movies, comedians as 'person'…). Always call this first to turn names into IDs.",
    schema: z.object({ name: z.string(), type: entityType.default("artist"), take: z.number().int().min(1).max(10).default(5) }),
  },
  search_tags: {
    description: "Find Qloo tag IDs (genres, cuisines, venue categories, vibes) by keyword.",
    schema: z.object({ query: z.string() }),
  },
  taste_tags: {
    description: "Taste fingerprint: the tags most associated with fans of the given entities, with affinity scores.",
    schema: z.object({ entity_ids: ids }),
  },
  audience_demographics: {
    description: "Age and gender skew of fans of the given entities (positive = over-indexes).",
    schema: z.object({ entity_ids: ids }),
  },
  recommend: {
    description:
      "Cross-domain recommendations from Qloo's taste graph: what fans of the given entities also love. type=place + location for venues/restaurants in a city.",
    schema: z.object({
      type: entityType,
      entity_ids: z.array(z.string()).max(5).optional(),
      tag_ids: z.array(z.string()).max(5).optional(),
      location: z.string().optional().describe("City name, e.g. 'Austin' — filters places, biases other types"),
      take: z.number().int().min(1).max(15).default(8),
    }),
  },
  city_heat: {
    description: `Rank cities in a region by fan affinity using Qloo's heatmap. Regions: ${REGIONS.map((r) => r.id).join(", ")}.`,
    schema: z.object({ entity_ids: ids, region: z.string().default("north-america"), top: z.number().int().min(1).max(20).default(8) }),
  },
  compare: {
    description: "Compare two groups of entities and return the taste themes they share (e.g. artist vs brand for sponsorship fit).",
    schema: z.object({ a_ids: ids, b_ids: ids }),
  },
} as const;

export type ToolName = keyof typeof TOOL_DEFS;

const slim = <T extends { tags?: unknown }>(e: T) => {
  const { tags, ...rest } = e as T & { tags?: Array<{ name: string }> };
  return { ...rest, tags: (tags ?? []).slice(0, 4).map((t) => t.name) };
};

export function makeToolHandlers(q = new QlooTools()) {
  return {
    search_entity: async (raw: unknown) => {
      const a = TOOL_DEFS.search_entity.schema.parse(raw);
      return (await q.searchEntities(a.name, a.type, a.take)).map(slim);
    },
    search_tags: async (raw: unknown) => {
      const a = TOOL_DEFS.search_tags.schema.parse(raw);
      return q.searchTags(a.query, 8);
    },
    taste_tags: async (raw: unknown) => {
      const a = TOOL_DEFS.taste_tags.schema.parse(raw);
      return q.tasteTags(a.entity_ids, 15);
    },
    audience_demographics: async (raw: unknown) => {
      const a = TOOL_DEFS.audience_demographics.schema.parse(raw);
      return q.demographics(a.entity_ids);
    },
    recommend: async (raw: unknown) => {
      const a = TOOL_DEFS.recommend.schema.parse(raw);
      if (!a.entity_ids?.length && !a.tag_ids?.length) throw new Error("Provide entity_ids or tag_ids as the taste signal");
      return (
        await q.recommend({ type: a.type, entityIds: a.entity_ids, tagIds: a.tag_ids, location: a.location, take: a.take })
      ).map(slim);
    },
    city_heat: async (raw: unknown) => {
      const a = TOOL_DEFS.city_heat.schema.parse(raw);
      const region = getRegion(a.region);
      const results = await Promise.allSettled(region.heatmapQueries.map((loc) => q.heatmap(a.entity_ids, loc)));
      const points = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
      const ranked = region.cities
        .map((city) => {
          const near = points.filter((p) => haversineKm(city, p) <= 80).map((p) => p.affinity);
          return { city: city.name, country: city.country, affinity: near.length ? Math.max(...near) : 0, points: near.length };
        })
        .sort((x, y) => y.affinity - x.affinity)
        .slice(0, a.top);
      return { region: region.label, heatPoints: points.length, cities: ranked };
    },
    compare: async (raw: unknown) => {
      const a = TOOL_DEFS.compare.schema.parse(raw);
      return q.compare(a.a_ids, a.b_ids, 10);
    },
  } satisfies Record<ToolName, (raw: unknown) => Promise<unknown>>;
}

/** OpenAI/Groq function-calling tool list. */
export function openAiTools() {
  return (Object.keys(TOOL_DEFS) as ToolName[]).map((name) => {
    const schema = z.toJSONSchema(TOOL_DEFS[name].schema, { io: "input" }) as Record<string, unknown>;
    delete schema.$schema;
    return {
      type: "function" as const,
      function: { name, description: TOOL_DEFS[name].description, parameters: schema },
    };
  });
}
