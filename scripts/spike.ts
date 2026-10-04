// Day-1 API spike: hits every Qloo endpoint/param combo ROADIE depends on and
// records what *actually* works (Qloo silently ignores bad params, so "200 OK"
// isn't proof). Writes docs/qloo-api-report.md.
//
//   npm run spike              (uses QLOO_API_KEY from .env.local)
//   npm run spike -- "Phoebe Bridgers"
import { mkdirSync, writeFileSync } from "fs";

const KEY = process.env.QLOO_API_KEY;
const BASE = (process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com").replace(/\/$/, "");
if (!KEY) {
  console.error("QLOO_API_KEY missing — add it to .env.local first.");
  process.exit(1);
}

const artistName = process.argv[2] ?? "Phoebe Bridgers";

async function call(path: string, params: Record<string, string>) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  const t = Date.now();
  const res = await fetch(url, { headers: { "X-Api-Key": KEY! } });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* non-json */
  }
  return { status: res.status, ms: Date.now() - t, json, text: text.slice(0, 300) };
}

function count(json: unknown): number {
  const r = (json as { results?: unknown })?.results;
  if (Array.isArray(r)) return r.length;
  if (r && typeof r === "object") for (const v of Object.values(r)) if (Array.isArray(v)) return v.length;
  return 0;
}

function sample(json: unknown): string {
  const r = (json as { results?: unknown })?.results;
  const arr = Array.isArray(r) ? r : r && typeof r === "object" ? Object.values(r).find(Array.isArray) : null;
  const first = (arr as unknown[] | null)?.[0];
  return first ? JSON.stringify(first).slice(0, 400) : "(empty)";
}

async function main() {
  const lines: string[] = [`# Qloo API spike report`, ``, `Run: ${new Date().toISOString()} · base ${BASE} · artist "${artistName}"`, ``];
  const search = await call("/search", { query: artistName, types: "urn:entity:artist", take: "3" });
  const id = ((search.json as { results?: Array<{ entity_id: string; name: string }> })?.results ?? [])[0]?.entity_id;
  console.log(`search → ${search.status} id=${id}`);
  if (!id) {
    console.error("Could not resolve artist; response:", search.text);
    process.exit(1);
  }

  const tagLookup = await call("/v2/tags", { "filter.query": "live music venue", take: "3" });
  const venueTag = ((tagLookup.json as { results?: { tags?: Array<{ id: string }> } })?.results?.tags ?? [])[0]?.id ?? "";

  const tests: Array<[string, string, Record<string, string>]> = [
    ["search artist", "/search", { query: artistName, types: "urn:entity:artist", take: "3" }],
    ["search comedian as person", "/search", { query: "John Mulaney", types: "urn:entity:person", take: "3" }],
    ["tags lookup: live music venue", "/v2/tags", { "filter.query": "live music venue", take: "3" }],
    ["tags lookup: restaurant", "/v2/tags", { "filter.query": "restaurant", take: "3" }],
    ["taste tags", "/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": id, take: "10" }],
    ["demographics", "/v2/insights", { "filter.type": "urn:demographics", "signal.interests.entities": id }],
    ["heatmap US", "/v2/insights", { "filter.type": "urn:heatmap", "filter.location.query": "United States", "signal.interests.entities": id }],
    ["heatmap India", "/v2/insights", { "filter.type": "urn:heatmap", "filter.location.query": "India", "signal.interests.entities": id }],
    ["brands", "/v2/insights", { "filter.type": "urn:entity:brand", "signal.interests.entities": id, take: "5" }],
    ["podcasts", "/v2/insights", { "filter.type": "urn:entity:podcast", "signal.interests.entities": id, take: "5" }],
    ["places in Austin", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location.query": "Austin", take: "5" }],
    ["venues in Austin (filter.tags)", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location.query": "Austin", "filter.tags": venueTag, take: "5" }],
    ["artists w/ signal.location Austin", "/v2/insights", { "filter.type": "urn:entity:artist", "signal.interests.entities": id, "signal.location.query": "Austin", take: "5" }],
    ["audiences", "/v2/insights", { "filter.type": "urn:audience", "signal.interests.entities": id, take: "5" }],
    ["audiences (life_stage)", "/v2/insights", { "filter.type": "urn:audience", "signal.interests.entities": id, "filter.parents.types": "urn:audience:life_stage", take: "5" }],
    ["compare", "/v2/insights/compare", { "a.signal.interests.entities": id, "b.signal.interests.entities": id }],
    ["trending", "/v2/trending", { "signal.interests.entities": id, "filter.type": "urn:entity:artist" }],
    ["SANITY: filter.location on artist (should be ignored)", "/v2/insights", { "filter.type": "urn:entity:artist", "signal.interests.entities": id, "filter.location.query": "Austin", take: "5" }],
  ];

  lines.push(`| Test | Status | ms | Results | Sample |`, `|---|---|---|---|---|`);
  for (const [name, path, params] of tests) {
    const r = await call(path, params);
    const n = count(r.json);
    const verdict = r.status === 200 && n > 0 ? "✅" : r.status === 200 ? "⚠️ empty" : `❌ ${r.status}`;
    console.log(`${verdict.padEnd(10)} ${name} (${r.ms}ms, ${n})`);
    lines.push(`| ${name} | ${verdict} | ${r.ms} | ${n} | \`${(r.status === 200 ? sample(r.json) : r.text).replace(/\|/g, "\\|").replace(/`/g, "'")}\` |`);
  }

  mkdirSync("docs", { recursive: true });
  writeFileSync("docs/qloo-api-report.md", lines.join("\n") + "\n");
  console.log("\nWrote docs/qloo-api-report.md — update src/lib/qloo/validate.ts if anything is ⚠️/❌.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
