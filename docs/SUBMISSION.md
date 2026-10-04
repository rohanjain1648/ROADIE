# Devpost submission text (draft)

> Replace the bracketed placeholders and the numbers once `npm run eval` has run against the live API.

## ROADIE: the AI tour manager that knows where your fans are

**Elevator pitch:** An agent that plans tours for independent artists and comedians using Qloo's taste graph. It routes by fan-affinity heatmaps, books venues the crowd already loves, and grounds every recommendation in a real Qloo entity.

### Inspiration
Independent musicians and comedians lose money on tour dates in cities where their audience isn't. Streaming dashboards only show where you've already played. When we asked a general-purpose LLM to plan a tour, it routed by population and recommended venues and openers we couldn't verify. Routing a tour is really a question about taste, and that's the question Qloo's graph can answer.

### What it does
- **Taste fingerprint:** Qloo tags, demographics and cross-domain affinities (brands, films, TV, podcasts, books) for the act's fans.
- **Affinity heatmap market scan:** ranks cities by fan concentration, then picks the hottest distinct markets.
- **Routing:** 2-opt TSP and date spreading across the tour window.
- **Per-city plan:** venues, openers / support acts, pre-show dinner and after-party spots, all Qloo entities with affinity scores.
- **Localized promo** in the city's language (including natural Hinglish), **local material** for comedians, and a **venue pitch email** that cites the data.
- **Brand partners** scored by audience overlap (`/v2/insights/compare`), plus **ad audiences** (`urn:audience`).
- **Critic step:** rejects any recommendation that isn't a Qloo candidate, and flags constraint problems.
- **Ask ROADIE:** a tool-calling agent that answers follow-ups by querying Qloo live.
- **With vs. without Qloo:** a side-by-side view with the LLM-only answer fact-checked against Qloo's graph.
- **MCP server:** the same 7 Qloo tools for any MCP client ("wire Qloo into the agent you already have").

### How it's Qloo-powered
Qloo supplies every fact. The LLM (Groq Llama 3.3 70B, or OpenAI) only chooses among Qloo candidates **by entity ID** and writes the copy. A parameter guard validates every request against per-`filter.type` rules, because the Insights API silently ignores invalid parameters. 11 endpoint/output types are used: search, tags, tag/demographics/heatmap/entity/audience insights, compare and trending.

**Results ([N] artists, 5 regions):** [X]% of LLM-only recommendations could not be verified in Qloo's graph, versus [Y]% grounded for ROADIE (mean audience affinity [Z]).

### How we built it
Next.js 16, TypeScript, an OpenAI SDK client pointed at Groq, zod-validated JSON outputs with a repair retry, server-sent events for the live agent trace, MapLibre heatmaps, Upstash Redis caching, and the MCP TypeScript SDK (Streamable HTTP and stdio).

### Challenges
- Qloo returns `200 OK` for parameters it ignores, so we built a validator and a spike script (`npm run spike`) that records which parameter combinations actually work.
- Keeping the LLM honest: it only sees candidate IDs, and the critic repairs any ID it invents.
- Making a 40+ call agent feel fast: parallel fan-out, caching, and streaming each step to the UI.

### What's next
Ticket-price and capacity data, Spotify / Bandcamp import for the artist's own listeners, multi-artist co-headline matching by taste overlap, and promoter-side SaaS.

### Try it
- Live app: [URL]. No login. Use the one-click demos on the home page.
- Code: [GitHub URL] (MIT)
- MCP: `[URL]/api/mcp`
