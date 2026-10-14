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
    <div className="min-h-screen bg-white">
      <Nav />

      {/* hero */}
      <section className="glow-bg relative overflow-hidden border-b border-line/70">
        <div className="grid-lines absolute inset-0" aria-hidden />
        <div className="blob -left-24 top-10 h-72 w-72 bg-[#c9b8ff]" aria-hidden />
        <div className="blob -right-16 top-40 h-64 w-64 bg-[#ffc2d6]" style={{ animationDelay: "-6s" }} aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-white/80 px-3.5 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-acid pulse-ring" />
              AI tour manager · grounded in Qloo&apos;s taste graph
            </div>
            <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-7xl">
              Book the cities where your fans{" "}
              <span className="font-serif-accent text-gradient pr-1 text-[1.08em]">already are.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Name an artist or comedian. Roadie maps where their audience really lives, then plans the route, venues, openers,
              sponsors and promo for every city, with a real Qloo ID behind every pick.
            </p>

            {/* quick start: straight into the planner with the artist prefilled */}
            <form action="/plan" className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-[0_20px_50px_-24px_rgba(91,50,240,0.35)] sm:flex-row sm:items-center">
              <label htmlFor="hero-artist" className="sr-only">Artist or comedian</label>
              <input
                id="hero-artist"
                name="artist"
                autoComplete="off"
                placeholder="Try “Phoebe Bridgers” or “Zakir Khan”"
                className="min-w-0 flex-1 rounded-xl bg-transparent px-4 py-3 text-base outline-none placeholder:text-muted/70"
              />
              <button className="btn-primary rounded-xl px-6 py-3 font-display text-sm font-semibold">Plan my tour →</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>or run a demo:</span>
              {DEMOS.map((d) => (
                <Link
                  key={d.artist}
                  href={`/plan?${d.q}&auto=1`}
                  className="btn-ghost rounded-full px-3 py-1 text-[13px] font-medium text-text"
                >
                  {d.artist}
                </Link>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
              {["No login", "Live agent trace", "Side-by-side vs. LLM-only", "MCP server included"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className="text-acid">✓</span> {t}
                </span>
              ))}
            </div>
          </div>
          <HeroPoster />
        </div>
      </section>

      {/* how it works, at a glance */}
      <section className="border-b border-line/70 bg-white">
        <div className="mx-auto grid max-w-7xl gap-px px-4 py-10 sm:px-6 md:grid-cols-4">
          {[
            ["1", "Pick an artist", "Search Qloo's graph or type a name."],
            ["2", "Watch it work", "Live trace as the heatmap fills in."],
            ["3", "Get a tour book", "Route, venues, openers, promo."],
            ["4", "Share it", "One link your agent or promoter can open."],
          ].map(([n, t, d]) => (
            <div key={n} className="flex items-start gap-3 px-2 py-3 md:px-5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acid/10 font-display text-sm font-bold text-acid">{n}</span>
              <div>
                <div className="font-display font-semibold">{t}</div>
                <div className="text-sm text-muted">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* demos */}
      <section id="demos" className="scroll-mt-20 bg-panel-2/60">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <Reveal>
            <SectionTitle kicker="Try it" title="One click. Watch the agent work." sub="Each demo runs the full agent live: Qloo calls stream into the trace while the map heats up and the stops fill in." />
          </Reveal>
          <div className="grid gap-5 md:grid-cols-3">
            {DEMOS.map((d, i) => (
              <Reveal key={d.artist} delay={i * 0.06}>
                <Link
                  href={`/plan?${d.q}&auto=1`}
                  className="card-hover group flex h-full flex-col rounded-3xl border border-line bg-panel p-7"
                >
                  <span className="inline-flex w-fit rounded-full bg-panel-2 px-3 py-1 text-xs font-medium text-muted">{d.tag}</span>
                  <div className="mt-5 font-display text-3xl font-bold tracking-tight">{d.artist}</div>
                  <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{d.blurb}</p>
                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-acid">
                    Run agent
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* problem */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <SectionTitle
            kicker="The problem"
            title="Touring is a taste problem disguised as a logistics problem."
            sub="Independent acts lose money playing rooms in cities where their audience isn't. Streaming stats only show where you've already been. Ask a generic chatbot and you get the ten biggest cities, plus venues that might not exist."
          />
        </Reveal>
        <div className="grid gap-5 md:grid-cols-2">
          <Reveal delay={0.05}>
            <div className="h-full rounded-3xl border border-line bg-panel p-8">
              <div className="mb-4 inline-flex rounded-full bg-heat/10 px-3 py-1 text-xs font-semibold text-heat">LLM only</div>
              <ul className="space-y-3 text-[15px] text-text/80">
                <li className="flex gap-3"><span className="text-heat">✗</span> Routes by population: &quot;New York, LA, Chicago…&quot;</li>
                <li className="flex gap-3"><span className="text-heat">✗</span> Venue names from memory that may be closed, wrong or made up</li>
                <li className="flex gap-3"><span className="text-heat">✗</span> Openers picked by genre stereotype</li>
                <li className="flex gap-3"><span className="text-heat">✗</span> Sponsors guessed from vibes</li>
                <li className="flex gap-3"><span className="text-heat">✗</span> The same promo copy in every city</li>
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-acid/25 bg-gradient-to-br from-acid/[0.06] to-white p-8 shadow-[0_24px_60px_-30px_rgba(91,50,240,0.4)]">
              <div className="mb-4 inline-flex rounded-full bg-acid/10 px-3 py-1 text-xs font-semibold text-acid">Roadie + Qloo</div>
              <ul className="space-y-3 text-[15px] text-text/90">
                <li className="flex gap-3"><span className="text-acid">✓</span> Routes by fan-affinity heatmap; skips cities that are big but cold</li>
                <li className="flex gap-3"><span className="text-acid">✓</span> Venues are Qloo places these fans over-index on, with affinity scores</li>
                <li className="flex gap-3"><span className="text-acid">✓</span> Openers that local fans of this act already love</li>
                <li className="flex gap-3"><span className="text-acid">✓</span> Brands scored by audience overlap via /compare</li>
                <li className="flex gap-3"><span className="text-acid">✓</span> Promo per city, in the local language, using the fans&apos; own taste</li>
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* pipeline */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal>
          <SectionTitle
            kicker="Under the hood"
            title="Plan → gather → decide → verify"
            sub="The LLM never supplies facts. Qloo provides the candidates; the model chooses among them by ID and writes the copy. Then a critic checks every ID."
          />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map(([name, api, what], i) => (
            <Reveal key={name} delay={i * 0.03}>
              <div className="card-hover h-full rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-acid/10 font-mono text-[11px] font-semibold text-acid">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-display text-lg font-semibold">{name}</span>
                </div>
                <div className="mt-3 font-mono text-[11px] text-sky">{api}</div>
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
      <section className="bg-panel-2/60">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-20 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {[
            ["Independent artists", "Route your first headline run without a booking agent's rolodex."],
            ["Comedians", "Comedy rooms, support acts and per-city local material."],
            ["Promoters & agents", "Pitch venues with fan-affinity evidence, not gut feel."],
            ["Brands", "Find the tours whose audiences already love you."],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 0.05}>
              <div className="card-hover h-full rounded-2xl border border-line bg-panel p-6">
                <div className="font-display text-lg font-semibold">{t}</div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* mcp */}
      <section id="mcp" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <Reveal>
            <SectionTitle
              kicker="Bring your own agent"
              title="ROADIE's taste tools, as an MCP server"
              sub="The same seven validated Qloo tools ROADIE uses (search, tags, taste fingerprint, demographics, cross-domain recs, city heat, compare) are exposed over MCP. Add them to Claude Desktop, Cursor or any MCP client and your existing agent gets cultural grounding."
            />
          </Reveal>
          <Reveal delay={0.08} className="min-w-0">
            <pre className="scrollbar-thin overflow-x-auto rounded-3xl border border-[#2a2640] bg-[#14111f] p-6 font-mono text-[12px] leading-relaxed text-[#d9d4f2] shadow-[0_30px_60px_-30px_rgba(21,19,31,0.5)]">
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

      {/* final CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#5b32f0] via-[#7b4cf5] to-[#e3336e] px-8 py-16 text-center text-white shadow-[0_40px_80px_-40px_rgba(91,50,240,0.7)] sm:px-16">
            <div className="blob left-1/4 top-0 h-56 w-56 bg-white/30" aria-hidden />
            <h2 className="relative font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Your next tour, <span className="font-serif-accent text-[1.1em]">routed by taste.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-white/85">No login. Watch every Qloo call as the agent works.</p>
            <Link href="/plan" className="relative mt-8 inline-flex rounded-full bg-white px-7 py-3.5 font-display text-sm font-semibold text-acid shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">
              Plan a tour →
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="border-t border-line/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo />
          <div>Built for the Qloo Agentic Hackathon · MIT licensed · Taste data © Qloo</div>
        </div>
      </footer>
    </div>
  );
}
