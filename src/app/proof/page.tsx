import { readFile } from "fs/promises";
import path from "path";
import Link from "next/link";
import { Nav, SectionTitle } from "@/components/ui";

export const metadata = { title: "Proof — ROADIE vs LLM-only" };
export const dynamic = "force-dynamic";

interface EvalFile {
  generatedAt: string;
  mode: { qloo: string; llm: string; llmModel: string };
  totals: {
    artists: number;
    llmOnlyChecked: number;
    llmOnlyVerified: number;
    roadieRecs: number;
    roadieGrounded: number;
    llmOnlyHallucinationRate: number | null;
    roadieGroundedRate: number | null;
  };
  rows: Array<{
    artist: string;
    region: string;
    kind: string;
    llmOnly: { checked: number; verified: number; verifiedRate: number | null; examplesNotFound: string[] };
    roadie: { recs: number; grounded: number; meanAffinity: number | null; cities: string[] };
  }>;
}

async function loadEval(): Promise<EvalFile | null> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), "public", "eval-results.json"), "utf8"));
  } catch {
    return null;
  }
}

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n * 100)}%`);

export default async function ProofPage() {
  const data = await loadEval();

  return (
    <div className="glow-bg min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <SectionTitle
          kicker="Evaluation"
          title="Does Qloo actually make the agent better?"
          sub="We give the same tour brief to a bare LLM and to ROADIE, then check every venue, opener, restaurant and brand against Qloo's entity graph. An agent that's about to email a venue booker can't act on a place it can't verify."
        />

        {!data ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-sm text-muted">
            <p className="text-text">No evaluation results yet.</p>
            <p className="mt-2">
              Run <code className="rounded bg-panel-2 px-1.5 py-0.5 font-mono text-acid">npm run eval</code> with{" "}
              <code className="font-mono">QLOO_API_KEY</code> and <code className="font-mono">GROQ_API_KEY</code> (or{" "}
              <code className="font-mono">OPENAI_API_KEY</code>) set. It writes <code className="font-mono">public/eval-results.json</code>, which this page renders.
            </p>
            <p className="mt-2">
              Meanwhile, open any tour and use the <Link href="/plan" className="text-acid underline">“With vs. without Qloo”</Link> tab to run the comparison live.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-heat/30 bg-heat/[0.05] p-5">
                <div className="font-display text-4xl font-extrabold text-heat">{pct(data.totals.llmOnlyHallucinationRate)}</div>
                <div className="mt-1 text-sm text-muted">of LLM-only recommendations could not be verified in Qloo&apos;s graph</div>
              </div>
              <div className="rounded-2xl border border-acid/30 bg-acid/[0.05] p-5">
                <div className="font-display text-4xl font-extrabold text-acid">{pct(data.totals.roadieGroundedRate)}</div>
                <div className="mt-1 text-sm text-muted">of ROADIE recommendations are grounded Qloo entities with affinity scores</div>
              </div>
              <div className="rounded-2xl border border-line bg-panel p-5">
                <div className="font-display text-4xl font-extrabold">{data.totals.artists}</div>
                <div className="mt-1 text-sm text-muted">
                  artists across regions · {data.mode.llm} {data.mode.llmModel} · {new Date(data.generatedAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            <div className="mt-8 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-panel-2 text-left text-[11px] uppercase tracking-wider text-muted">
                  <tr>
                    <th className="px-4 py-3">Artist</th>
                    <th className="px-4 py-3">LLM-only verified</th>
                    <th className="px-4 py-3">Unverifiable examples</th>
                    <th className="px-4 py-3">ROADIE grounded</th>
                    <th className="px-4 py-3">Mean affinity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.artist} className="border-t border-line align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.artist}</div>
                        <div className="text-xs text-muted">{r.region} · {r.kind}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">{r.llmOnly.verified}/{r.llmOnly.checked}</td>
                      <td className="px-4 py-3 text-xs text-muted">{r.llmOnly.examplesNotFound.join(" · ") || "—"}</td>
                      <td className="px-4 py-3 font-mono text-acid">{r.roadie.grounded}/{r.roadie.recs}</td>
                      <td className="px-4 py-3 font-mono">{r.roadie.meanAffinity?.toFixed(2) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            ["Verifiability", "Each LLM-only name is matched against Qloo /search (fuzzy name + city check for places). Not found = can't be verified or acted on."],
            ["Grounding", "ROADIE's LLM only chooses among Qloo candidates by ID. The critic rejects any ID that wasn't in the candidate set."],
            ["Audience fit", "Mean Qloo affinity of ROADIE's picks: how strongly the artist's fans over-index on each venue, opener and restaurant."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-line bg-panel p-5">
              <div className="font-semibold">{t}</div>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
