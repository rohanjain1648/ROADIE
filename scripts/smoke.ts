// End-to-end smoke test of the agent pipeline (works in mock mode with no keys).
//   npx tsx scripts/smoke.ts
import { runTourAgent } from "../src/lib/agent/pipeline";
import { makeToolHandlers, openAiTools } from "../src/lib/agent/toolDefs";
import { runtimeMode } from "../src/lib/env";

async function main() {
  console.log("mode", runtimeMode());
  let calls = 0;
  const plan = await runTourAgent(
    {
      artist: process.argv[2] ?? "Phoebe Bridgers",
      kind: (process.argv[3] as "music" | "comedy") ?? "music",
      region: process.argv[4] ?? "north-america",
      startDate: "2027-03-01",
      endDate: "2027-03-20",
      shows: 6,
      capacity: "club",
      language: "English",
    },
    (e) => {
      if (e.type === "call") calls++;
      if (e.type === "step" && e.status !== "running") console.log(`  [${e.status}] ${e.id}: ${e.detail ?? ""}`);
      if (e.type === "thought") console.log(`  💭 ${e.text}`);
    },
  );
  console.log(`\nplan ${plan.id}: ${plan.stops.length} stops, ${calls} Qloo calls, ${plan.stats.ms}ms`);
  for (const s of plan.stops) console.log(`  ${s.date} ${s.city.padEnd(14)} heat ${s.heat} @ ${s.venue.pick?.name} (opener: ${s.openers[0]?.name})`);
  console.log("critic:", plan.critic.checks.map((c) => `${c.pass ? "✓" : "✗"} ${c.label}`).join(" | "));

  const tools = openAiTools();
  console.log(`\n${tools.length} chat tools:`, tools.map((t) => t.function.name).join(", "));
  const h = makeToolHandlers();
  const heat = await h.city_heat({ entity_ids: [plan.artist.id], region: "india", top: 3 });
  console.log("city_heat india:", JSON.stringify(heat));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
