import type { QParams } from "./types";

// Qloo's Insights API *silently ignores* parameters that are invalid for the
// chosen filter.type (200 OK, unfiltered or empty results). That is the #1 way
// hackathon projects ship quietly-wrong data. We reject bad combos *before*
// the request leaves the server and surface the rejection in the agent trace.
//
// Keep this table in sync with docs/qloo-api-notes.md (update it after running
// `npm run spike` against the live hackathon API).

export class QlooParamError extends Error {
  constructor(
    message: string,
    public readonly param: string,
  ) {
    super(message);
    this.name = "QlooParamError";
  }
}

const ALL_ENTITY = [
  "urn:entity:artist",
  "urn:entity:book",
  "urn:entity:brand",
  "urn:entity:destination",
  "urn:entity:movie",
  "urn:entity:person",
  "urn:entity:place",
  "urn:entity:podcast",
  "urn:entity:tv_show",
  "urn:entity:video_game",
];
const OUTPUT_TYPES = [...ALL_ENTITY, "urn:tag", "urn:demographics", "urn:heatmap", "urn:audience"];

/** Param prefix → filter.type values it is valid for. `*` = all types. */
const RULES: Array<{ prefix: string; validFor: string[] | "*" }> = [
  { prefix: "signal.interests.entities", validFor: "*" },
  { prefix: "signal.interests.tags", validFor: "*" },
  { prefix: "signal.demographics.", validFor: "*" },
  { prefix: "signal.location", validFor: "*" },
  { prefix: "take", validFor: "*" },
  { prefix: "page", validFor: "*" },
  { prefix: "feature.explainability", validFor: "*" },
  { prefix: "filter.type", validFor: "*" },
  { prefix: "filter.tags", validFor: ALL_ENTITY },
  { prefix: "filter.exclude.entities", validFor: ALL_ENTITY },
  { prefix: "filter.exclude.tags", validFor: ALL_ENTITY },
  { prefix: "filter.popularity", validFor: ALL_ENTITY },
  { prefix: "filter.location", validFor: ["urn:entity:place", "urn:entity:destination", "urn:heatmap"] },
  { prefix: "filter.geocode", validFor: ["urn:entity:place", "urn:entity:destination"] },
  { prefix: "filter.price_level", validFor: ["urn:entity:place"] },
  { prefix: "filter.properties.business_rating", validFor: ["urn:entity:place"] },
  { prefix: "filter.release_year", validFor: ["urn:entity:movie", "urn:entity:tv_show", "urn:entity:book"] },
  { prefix: "filter.parents.types", validFor: ["urn:audience", "urn:entity:place", ...ALL_ENTITY] },
  { prefix: "filter.tag.types", validFor: ["urn:tag"] },
  { prefix: "filter.audience.types", validFor: ["urn:audience"] },
  { prefix: "output.heatmap", validFor: ["urn:heatmap"] },
];

const VALID_AUDIENCE_PARENTS = new Set([
  "urn:audience:communities",
  "urn:audience:global_issues",
  "urn:audience:hobbies_and_interests",
  "urn:audience:investing_interests",
  "urn:audience:leisure",
  "urn:audience:life_stage",
  "urn:audience:lifestyle_preferences_beliefs",
  "urn:audience:political_preferences",
  "urn:audience:professional_area",
  "urn:audience:spending_habits",
]);

export function validateInsightsParams(params: QParams): void {
  const type = params["filter.type"];
  if (!type || typeof type !== "string") throw new QlooParamError("filter.type is required", "filter.type");
  if (!OUTPUT_TYPES.includes(type)) throw new QlooParamError(`Unknown filter.type "${type}"`, "filter.type");

  const hasSignal = Object.keys(params).some((k) => k.startsWith("signal.") && params[k] !== undefined && params[k] !== "");
  if (!hasSignal && type !== "urn:audience") {
    throw new QlooParamError("Insights needs at least one signal.* parameter", "signal");
  }

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    const rule = RULES.find((r) => key === r.prefix || key.startsWith(r.prefix));
    if (!rule) throw new QlooParamError(`Unrecognised parameter "${key}"`, key);
    if (rule.validFor !== "*" && !rule.validFor.includes(type)) {
      throw new QlooParamError(`"${key}" is silently ignored for ${type} — refusing to send`, key);
    }
    if (key === "filter.parents.types") {
      for (const v of String(value).split(",")) {
        if (v.startsWith("urn:audience:") && !VALID_AUDIENCE_PARENTS.has(v)) {
          throw new QlooParamError(`Invalid audience parent "${v}"`, key);
        }
      }
    }
    if (key === "take") {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 50) throw new QlooParamError("take must be 1..50", key);
    }
  }
}
