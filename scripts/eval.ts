// "Qloo vs LLM-only" evaluation. For each test artist we run:
//   A) the bare LLM (GROQ/OPENAI) planning a tour from its own knowledge
//   B) ROADIE (Qloo-grounded agent)
// and measure how many named venues/openers/restaurants/brands actually exist
// in Qloo's graph (hallucination proxy) plus ROADIE's mean audience affinity.
// Results → public/eval-results.json, rendered on /proof.
//
//   npm run eval            (needs QLOO_API_KEY + GROQ_API_KEY or OPENAI_API_KEY)
//   npm run eval -- 5       (limit to first 5 artists)
import { mkdirSync, writeFileSync } from "fs";
import { runBaseline } from "../src/lib/agent/baseline";
import { runTourAgent } from "../src/lib/agent/pipeline";
import type { TourRequest } from "../src/lib/agent/types";
import { runtimeMode } from "../src/lib/env";

const ARTISTS: Array<Pick<TourRequest, "artist" | "kind" | "region">> = [
  { artist: "Phoebe Bridgers", kind: "music", region: "north-america" },
  { artist: "Khruangbin", kind: "music", region: "north-america" },
  { artist: "Mitski", kind: "music", region: "uk-europe" },
  { artist: "Fred again..", kind: "music", region: "uk-europe" },
  { artist: "Prateek Kuhad", kind: "music", region: "india" },
  { artist: "The Local Train", kind: "music", region: "india" },
  { artist: "Tame Impala", kind: "music", region: "australia-nz" },
  { artist: "Peso Pluma", kind: "music", region: "latin-america" },
  { artist: "John Mulaney", kind: "comedy", region: "north-america" },
  { artist: "Zakir Khan", kind: "comedy", region: "india" },
];

interface EvalRow {
  artist: string;
  region: string;
  kind: string;
  llmOnly: { checked: number; verified: number; verifiedRate: number | null; examplesNotFound: string[] };
  roadie: { recs: number; grounded: number; groundedRate: number | null; meanAffinity: number | null; cities: string[]; ms: number };
}

async function main() {
  const mode = runtimeMode();
  if (mode.qloo === "mock" || mode.llm === "mock") {
    console.error("Eval needs live keys (QLOO_API_KEY and GROQ_API_KEY/OPENAI_API_KEY). Current mode:", mode);
    process.exit(1);
  }
  const limit = Number(process.argv[2] ?? ARTISTS.length);
  const rows: EvalRow[] = [];
  for (const a of ARTISTS.slice(0, limit)) {
    const req: TourRequest = {
      ...a,
      startDate: "2027-03-01",
      endDate: "2027-03-21",
      shows: 5,
      capacity: "club",
      language: "English",
    };
    console.log(`\n▶ ${a.artist} (${a.region})`);
    try {
      const baseline = await runBaseline(req);
      const plan = await runTourAgent(req, () => {});
      const recs = plan.stops.flatMap((s) => [s.venue.pick, ...s.openers, s.hospitality.preShow]).filter(Boolean);
      const affs = recs.map((r) => r!.affinity ?? 0).filter((x) => x > 0);
      const row: EvalRow = {
        artist: a.artist,
        region: a.region,
        kind: a.kind,
        llmOnly: {
          checked: baseline.summary.checked,
          verified: baseline.summary.verified,
          verifiedRate: baseline.summary.verifiedRate,
          examplesNotFound: baseline.checks.filter((c) => c.status === "not-found").slice(0, 4).map((c) => `${c.name} (${c.city})`),
        },
        roadie: {
          recs: recs.length,
          grounded: plan.stats.groundedRecs,
          groundedRate: recs.length ? plan.stats.groundedRecs / recs.length : null,
          meanAffinity: affs.length ? affs.reduce((x, y) => x + y, 0) / affs.length : null,
          cities: plan.stops.map((s) => s.city),
          ms: plan.stats.ms,
        },
      };
      console.log(`  LLM-only verified ${row.llmOnly.verified}/${row.llmOnly.checked} · ROADIE grounded ${row.roadie.grounded}/${row.roadie.recs}`);
      rows.push(row);
    } catch (err) {
      console.error("  failed:", err instanceof Error ? err.message : err);
    }
  }

  const sum = (f: (r: EvalRow) => number) => rows.reduce((acc, r) => acc + f(r), 0);
  const totals = {
    artists: rows.length,
    llmOnlyChecked: sum((r) => r.llmOnly.checked),
    llmOnlyVerified: sum((r) => r.llmOnly.verified),
    roadieRecs: sum((r) => r.roadie.recs),
    roadieGrounded: sum((r) => r.roadie.grounded),
  };
  const out = {
    generatedAt: new Date().toISOString(),
    mode,
    totals: {
      ...totals,
      llmOnlyHallucinationRate: totals.llmOnlyChecked ? 1 - totals.llmOnlyVerified / totals.llmOnlyChecked : null,
      roadieGroundedRate: totals.roadieRecs ? totals.roadieGrounded / totals.roadieRecs : null,
    },
    rows,
  };
  mkdirSync("public", { recursive: true });
  writeFileSync("public/eval-results.json", JSON.stringify(out, null, 2));
  console.log("\nWrote public/eval-results.json", out.totals);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
