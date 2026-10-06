# ROADIE: an AI tour manager that knows where your fans are

> An agentic tour planner for independent artists and comedians, grounded in **Qloo's 250M+ entity taste graph**.
> Built for the [Qloo Agentic Hackathon](https://qloo.devpost.com/).

**Live demo:** `https://<your-deployment>.vercel.app` · **MCP endpoint:** `https://<your-deployment>.vercel.app/api/mcp` · **License:** MIT

---

## What it does

You enter an artist (or comedian), a region, a date window and a room size. ROADIE's agent then:

1. **Resolves** the act in Qloo's graph (`/search`).
2. **Builds a taste fingerprint**: Qloo taste tags, an age/gender skew and **cross-domain affinities** (the brands, films, TV, podcasts and books the fans love).
3. **Scans an affinity heatmap** (`urn:heatmap`) across the region and ranks cities by *fan concentration*, not population.
4. **Routes the tour**: it picks the hottest distinct markets, orders them with a nearest-neighbour + 2-opt TSP, and spreads the dates across the window with travel days.
5. **Plans every stop** using Qloo candidates only:
   - 🎤 **Venues** these fans over-index on (`urn:entity:place` + `filter.location` + venue tag)
   - 🤝 **Openers / support acts** loved by *local* fans (`signal.location`)
   - 🍜 **Pre-show dinner + after-party** spots that match the crowd
   - 📣 **Promo** in the local language (English, Hindi, **Hinglish**, Tamil, Spanish, …)
   - 😂 **Local material** for comedians: observational premises tying each city to the audience's taste
   - ✉️ A **venue pitch email** that cites the affinity data
6. **Scores brand partners** by audience overlap (`/v2/insights/compare`) and finds **ad audiences** (`urn:audience`).
7. **Critic**: it rejects any recommendation whose ID wasn't in the Qloo candidate set, then checks dates, duplicates and cold markets.

Then you can:

- **Ask ROADIE**: a real tool-calling agent (Groq or OpenAI function calling) that queries Qloo to answer follow-ups such as *"swap the weakest stop for a hotter city"*.
- **With vs. without Qloo**: the same brief goes to the bare LLM, and every name it returns is fact-checked against Qloo's entity graph, side by side.
- **Share / export**: share link, JSON export, print.
- **MCP server**: the same seven validated Qloo tools, usable from Claude Desktop, Cursor or any MCP client.

## Why it needs Qloo

An LLM alone sends you to the ten biggest cities and lists venues from memory, some of which are closed or never existed. ROADIE's LLM **never supplies facts**. Qloo supplies the candidates (with entity IDs and affinity scores), the model only *chooses among them by ID* and writes the copy, and the critic enforces that rule. Without Qloo the product has nothing to stand on: no heatmap, no fan-loved venues, no cross-domain brand fit.

`/proof` reports the measured gap: `npm run eval` runs 10 artists across 5 regions through both arms.

## Architecture

```
Next.js 16 (App Router) ── /plan ── SSE stream of agent events ──► live trace + map + stop cards
        │
        ├─ /api/tour      runTourAgent()  plan → gather (Qloo, parallel) → decide (LLM over IDs) → critic
        ├─ /api/baseline  LLM-only arm + Qloo /search verification
        ├─ /api/chat      tool-calling agent (7 Qloo tools)
        ├─ /api/mcp       MCP server (Streamable HTTP, stateless)
        └─ /api/search    artist autocomplete
                │
        src/lib/qloo/
          client.ts    X-Api-Key, GET-only, 24h cache, retry/backoff, per-call telemetry
          validate.ts  per-filter.type parameter guard (Qloo silently ignores bad params)
          tools.ts     typed tools + response normalisers
          mock.ts      deterministic, clearly-labelled mock data for keyless dev
        src/lib/llm.ts OpenAI SDK → Groq (baseURL swap) or OpenAI; JSON mode + zod validation + repair retry
        src/lib/geo/   city dataset (5 regions), haversine, 2-opt routing, date scheduling
        src/lib/cache  in-memory LRU + optional Upstash Redis (share links, cache, rate limits)
```

### Qloo endpoints used

| Purpose | Call |
|---|---|
| Resolve act | `GET /search?query=…&types=urn:entity:artist` (comedians: `urn:entity:person`) |
| Tag IDs | `GET /v2/tags?filter.query=live music venue` |
| Taste fingerprint | `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=…` |
| Demographics | `filter.type=urn:demographics` |
| Market heatmap | `filter.type=urn:heatmap&filter.location.query=<country>` |
| Cross-domain | `filter.type=urn:entity:{brand,movie,tv_show,podcast,book}` |
| Venues / food / bars | `filter.type=urn:entity:place&filter.location.query=<city>&filter.tags=<tag>` |
| Openers | `filter.type=urn:entity:artist&signal.location.query=<city>` |
| Ad audiences | `filter.type=urn:audience` (+ `filter.parents.types`) |
| Brand fit | `GET /v2/insights/compare?a.signal.interests.entities=…&b.signal.interests.entities=…` |
| Momentum | `GET /v2/trending` |

### The parameter guard

The Insights API **silently ignores** parameters that don't apply to the requested `filter.type`: you get `200 OK` and quietly wrong data. `src/lib/qloo/validate.ts` checks every request against a per-type rule table and refuses to send bad combinations. Refused calls appear as `rejected` in the agent trace.

## Run it locally

```bash
git clone https://github.com/<you>/roadie && cd roadie
npm install
cp .env.example .env.local     # add QLOO_API_KEY + GROQ_API_KEY (or OPENAI_API_KEY)
npm run dev                    # http://localhost:3000
```

With **no keys at all** the app still runs end to end in *mock mode*. Qloo responses are deterministic placeholders, clearly labelled in the UI.

| Script | What it does |
|---|---|
| `npm run spike` | Calls every Qloo endpoint/param combo ROADIE uses and writes `docs/qloo-api-report.md` (✅ / ⚠️ empty / ❌) |
| `npm run eval` | Runs the LLM-only vs ROADIE evaluation and writes `public/eval-results.json` (shown on `/proof`) |
| `npm run mcp` | Starts the MCP server over stdio |
| `npx tsx scripts/smoke.ts` | Runs the agent headless and prints the plan |
| `npm run typecheck` / `npm run lint` | Static checks |

### LLM choice

- **Groq** (default when `GROQ_API_KEY` is set): `openai/gpt-oss-120b`. It's fast, and JSON mode plus tool calling are supported. Groq retires models over time; on a 404, list what your key can use with `curl https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"` and set `GROQ_MODEL`. On the free tier, parallel city planning can hit rate limits; the SDK retries with backoff, and any step that still fails falls back to a deterministic template, so the tour always completes.
- **OpenAI**: `gpt-4.1-mini` by default (`OPENAI_MODEL`).

## Deploy (Vercel)

1. Push to GitHub, then **Import** the project in Vercel.
2. Add env vars: `QLOO_API_KEY`, `GROQ_API_KEY` (or `OPENAI_API_KEY`), and **`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`**. Upstash is needed for share links and caching to survive serverless cold starts.
3. Deploy. `/api/tour` streams for up to 300 s (`maxDuration`); a typical run takes 10–40 s.
4. Run `npm run eval` locally with live keys, commit `public/eval-results.json`, and redeploy so `/proof` shows the numbers.

## Use the MCP server

```jsonc
// Claude Desktop / Cursor: remote
{ "mcpServers": { "roadie-qloo": { "type": "http", "url": "https://<your-deployment>/api/mcp" } } }

// local stdio
{ "mcpServers": { "roadie-qloo": { "command": "npm", "args": ["run", "mcp", "--prefix", "/path/to/roadie"] } } }
```

Tools: `qloo_search_entity`, `qloo_search_tags`, `qloo_taste_tags`, `qloo_audience_demographics`, `qloo_recommend`, `qloo_city_heat`, `qloo_compare`.

## License

MIT. See [LICENSE](LICENSE). Taste data © Qloo; map tiles © CARTO / OpenStreetMap contributors.
