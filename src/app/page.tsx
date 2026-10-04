import Link from "next/link";
import { HeroPoster } from "@/components/HeroPoster";
import { Reveal } from "@/components/Reveal";
import { Logo, Nav, SectionTitle } from "@/components/ui";

const DEMOS = [
  {
    tag: "Indie folk · North America",
    artist: "Phoebe Bridgers",
    q: "artist=Phoebe%20Bridgers&kind=music&region=north-america&shows=6&capacity=theatre",
    blurb: "Where does a sad-girl-indie audience over-index once you leave LA and NYC?",
  },
  {
    tag: "Stand-up · India · Hinglish promo",
    artist: "Zakir Khan",
    q: "artist=Zakir%20Khan&kind=comedy&region=india&language=Hinglish&shows=6&capacity=theatre",
    blurb: "Comedy-club picks, local material per city, and promo in natural Hinglish.",
  },
  {
    tag: "Psych-funk · UK & Europe",
    artist: "Khruangbin",
    q: "artist=Khruangbin&kind=music&region=uk-europe&shows=8&capacity=theatre",
    blurb: "A continental run routed by taste heat, not by capital cities.",
  },
];

const PIPELINE = [
  ["Resolve", "/search", "Find the artist's entity in Qloo's graph"],
  ["Fingerprint", "/v2/insights · urn:tag, urn:demographics", "Taste tags + age/gender skew"],
  ["Cross-domain", "/v2/insights · brand, movie, tv, podcast, book", "What else the fans love"],
  ["Market scan", "/v2/insights · urn:heatmap", "Geographic affinity → ranked cities"],
  ["Route", "2-opt TSP + date spreader", "Hottest distinct markets, sensible order"],
  ["Per-city", "/v2/insights · place + filter.location, artist + signal.location", "Venues, openers, dinner, after-party"],
  ["Partners", "/v2/insights/compare · urn:audience", "Brand overlap themes + ad segments"],
  ["Decide", "Groq / OpenAI over grounded candidates", "Chooses by Qloo ID, writes promo + pitch"],
  ["Critic", "deterministic checks", "Rejects ungrounded IDs, flags constraint breaks"],
];

export default function Home() {
  return (
    <div className="glow-bg min-h-screen">
      <Nav />

      {/* hero */}
      <section className="grid-lines border-b border-line/60">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-acid/30 bg-acid/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-acid">
              Agentic tour manager · powered by Qloo
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl">
              Book the cities where your fans <span className="text-acid">already are.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              ROADIE is an AI agent that plans tours for independent artists and comedians using Qloo&apos;s 250M+ entity taste graph.
              It finds affinity hotspots, venues your crowd already loves, openers, brand partners and city-tuned promo. Every pick
              has a real Qloo ID behind it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="rounded-xl bg-acid px-5 py-3 font-display text-sm font-bold text-ink transition hover:shadow-[0_0_40px_-8px_rgba(200,255,61,0.8)]"
              >
                Plan a tour →
              </Link>
              <a href="#demos" className="rounded-xl border border-line px-5 py-3 text-sm font-semibold hover:border-acid/50">
                Try a one-click demo
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              <span>✓ No login</span>
              <span>✓ Live agent trace</span>
              <span>✓ Side-by-side vs. LLM-only</span>
              <span>✓ MCP server included</span>
            </div>
          </div>
          <HeroPoster />
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionTitle
            kicker="The problem"
            title="Touring is a taste problem disguised as a logistics problem."
            sub="Independent acts lose money playing rooms in cities where their audience isn't. Streaming stats only show where you've already been. Ask a generic chatbot and you get the ten biggest cities, plus venues that might not exist."
          />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="h-full rounded-2xl border border-line bg-panel p-6">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-heat">LLM only</div>
              <ul className="space-y-2.5 text-sm text-text/80">
                <li>✗ Routes by population: &quot;New York, LA, Chicago…&quot;</li>
                <li>✗ Venue names from memory that may be closed, wrong or made up</li>
                <li>✗ Openers picked by genre stereotype</li>
                <li>✗ Sponsors guessed from vibes</li>
                <li>✗ The same promo copy in every city</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-2xl border border-acid/30 bg-acid/[0.04] p-6">
              <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.2em] text-acid">ROADIE + Qloo</div>
              <ul className="space-y-2.5 text-sm text-text/90">
                <li>✓ Routes by fan-affinity heatmap; skips cities that are big but cold</li>
                <li>✓ Venues are Qloo places these fans over-index on, with affinity scores</li>
                <li>✓ Openers that local fans of this act already love</li>
                <li>✓ Brands scored by audience overlap via /compare</li>
                <li>✓ Promo per city, in the local language, using the fans&apos; own taste</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* demos */}
      <section id="demos" className="border-y border-line/60 bg-panel/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <SectionTitle kicker="Try it" title="One click. Watch the agent work." sub="Each demo runs the full agent live: Qloo calls stream into the trace while the map heats up and the stops fill in." />
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {DEMOS.map((d, i) => (
              <Reveal key={d.artist} delay={i * 0.06}>
                <Link
                  href={`/plan?${d.q}&auto=1`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-panel p-6 transition hover:-translate-y-0.5 hover:border-acid/50"
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">{d.tag}</div>
                  <div className="mt-3 font-display text-2xl font-bold">{d.artist}</div>
                  <p className="mt-2 flex-1 text-sm text-muted">{d.blurb}</p>
                  <div className="mt-5 text-sm font-semibold text-acid group-hover:underline">Run agent →</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* pipeline */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionTitle
            kicker="Under the hood"
            title="Plan → gather → decide → verify"
            sub="The LLM never supplies facts. Qloo provides the candidates; the model chooses among them by ID and writes the copy. Then a critic checks every ID."
          />
        </Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map(([name, api, what], i) => (
            <Reveal key={name} delay={i * 0.03}>
              <div className="h-full rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-acid">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-semibold">{name}</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-sky">{api}</div>
                <div className="mt-1.5 text-sm text-muted">{what}</div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-6 rounded-xl border border-line bg-panel-2 p-4 text-sm text-muted">
            <span className="font-semibold text-text">Parameter guard.</span> Qloo silently ignores parameters that don&apos;t apply to a{" "}
            <code className="font-mono text-sky">filter.type</code>. ROADIE validates every request against a per-type rule table first and
            refuses to send anything that would come back quietly wrong. You can see rejected calls in the trace.
          </div>
        </Reveal>
      </section>

      {/* who */}
      <section className="border-y border-line/60 bg-panel/40">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            ["Independent artists", "Route your first headline run without a booking agent's rolodex."],
            ["Comedians", "Comedy rooms, support acts and per-city local material."],
            ["Promoters & agents", "Pitch venues with fan-affinity evidence, not gut feel."],
            ["Brands", "Find the tours whose audiences already love you."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-line bg-panel p-5">
                <div className="font-display font-bold">{t}</div>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* mcp */}
      <section id="mcp" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <Reveal>
            <SectionTitle
              kicker="Bring your own agent"
              title="ROADIE's taste tools, as an MCP server"
              sub="The same seven validated Qloo tools ROADIE uses (search, tags, taste fingerprint, demographics, cross-domain recs, city heat, compare) are exposed over MCP. Add them to Claude Desktop, Cursor or any MCP client and your existing agent gets cultural grounding."
            />
          </Reveal>
          <Reveal delay={0.08} className="min-w-0">
            <pre className="scrollbar-thin overflow-x-auto rounded-2xl border border-line bg-panel p-5 font-mono text-[12px] leading-relaxed text-text/90">
{`// Streamable HTTP (deployed)
{
  "mcpServers": {
    "roadie-qloo": {
      "type": "http",
      "url": "https://<your-deployment>/api/mcp"
    }
  }
}

// or local stdio
{
  "mcpServers": {
    "roadie-qloo": {
      "command": "npm",
      "args": ["run", "mcp", "--prefix", "/path/to/roadie"]
    }
  }
}`}
            </pre>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo />
          <div>Built for the Qloo Agentic Hackathon · MIT licensed · Taste data © Qloo</div>
        </div>
      </footer>
    </div>
  );
}
