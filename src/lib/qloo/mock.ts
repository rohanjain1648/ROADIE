import { REGIONS } from "../geo/cities";
import type { QParams } from "./types";

// Deterministic, clearly-labelled fake Qloo responses. Shapes mirror the live
// API so the exact same normalisation code runs in both modes. Every entity is
// flagged `mock: true` and the UI shows a "MOCK DATA" banner — never present
// these as real recommendations.

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: T[]) => arr[Math.floor(r() * arr.length)];
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const title = (s: string) => s.replace(/\b\w/g, (m) => m.toUpperCase());
const round = (n: number) => Math.round(n * 1000) / 1000;

const ADJ = ["Velvet", "Neon", "Paper", "Golden", "Hollow", "Silver", "Midnight", "Electric", "Quiet", "Wild", "Lunar", "Amber", "Crystal", "Rust", "Coral", "Static", "Copper", "Indigo"];
const NOUNS: Record<string, string[]> = {
  artist: ["Satellites", "Orchards", "Lanterns", "Echoes", "Tides", "Parade", "Ghosts", "Rivals", "Arcade", "Harbor"],
  venue: ["Room", "Hall", "Theatre", "Lounge", "Social Club", "Ballroom", "Basement", "Warehouse", "Listening Bar", "Music Hall"],
  comedy: ["Comedy Cellar", "Laugh Factory", "Punchline", "Improv", "Comedy Den", "Stand-Up Room"],
  food: ["Kitchen", "Taqueria", "Noodle Bar", "Supper Club", "Diner", "Izakaya", "Cantina", "Bistro", "Dhaba", "Pizzeria"],
  bar: ["Taproom", "Cocktail Bar", "Wine Bar", "Brewpub", "Speakeasy"],
  brand: ["Supply Co.", "Outfitters", "Coffee", "Audio", "Denim", "Cycles", "Studios", "Goods", "Sneakers", "Records"],
  movie: ["Summer", "Signal", "Shore", "Year", "Line", "Road", "Hours", "Season"],
  tv_show: ["Rivals", "Diaries", "Club", "Hotel", "Precinct", "Kitchen"],
  podcast: ["Hour", "Tapes", "Sessions", "Dispatch", "Notes", "Radio"],
  book: ["Garden", "Atlas", "Letters", "Tides", "Archive", "Season"],
  video_game: ["Odyssey", "Run", "Frontier", "Protocol", "Valley", "Drift"],
  person: ["Rivera", "Okafor", "Lindqvist", "Sharma", "Moreau", "Tanaka"],
  destination: ["Bay", "Coast", "Valley", "Heights", "Springs", "Isles"],
};

const TASTE_TAGS = [
  "indie rock", "dream pop", "bedroom pop", "lo-fi", "synthwave", "alt-country", "neo-soul", "garage rock",
  "shoegaze", "post-punk", "folk", "emo revival", "hyperpop", "jazz fusion", "nostalgic", "melancholic",
  "DIY culture", "vinyl collecting", "thrifting", "indie film", "craft beer", "late-night", "coffee culture",
  "skateboarding", "observational humor", "storytelling", "satire", "witty", "irreverent", "heartfelt",
];

const AUDIENCES: Array<[string, string]> = [
  ["Vinyl Collectors", "urn:audience:hobbies_and_interests"],
  ["Festival Goers", "urn:audience:leisure"],
  ["Indie Gamers", "urn:audience:hobbies_and_interests"],
  ["Craft Beer Enthusiasts", "urn:audience:lifestyle_preferences_beliefs"],
  ["Sustainable Shoppers", "urn:audience:spending_habits"],
  ["Night Owls", "urn:audience:lifestyle_preferences_beliefs"],
  ["Young Professionals", "urn:audience:life_stage"],
  ["College Students", "urn:audience:life_stage"],
  ["Foodies", "urn:audience:leisure"],
  ["Creative Professionals", "urn:audience:professional_area"],
  ["Outdoor Adventurers", "urn:audience:leisure"],
  ["Comedy Fans", "urn:audience:leisure"],
];

const COUNTRY_CODES: Record<string, string> = {
  "united states": "US", canada: "CA", "united kingdom": "GB", ireland: "IE", france: "FR", germany: "DE",
  netherlands: "NL", spain: "ES", italy: "IT", sweden: "SE", belgium: "BE", portugal: "PT", austria: "AT",
  czechia: "CZ", denmark: "DK", norway: "NO", poland: "PL", switzerland: "CH", india: "IN", australia: "AU",
  "new zealand": "NZ", mexico: "MX", colombia: "CO", peru: "PE", chile: "CL", argentina: "AR", brazil: "BR",
};

const allCities = () => REGIONS.flatMap((r) => r.cities);

function cityFor(location?: string) {
  if (!location) return undefined;
  const l = location.toLowerCase();
  return allCities().find((c) => l.includes(c.name.toLowerCase()));
}

function mockEntity(type: string, r: () => number, seed: string, opts: { location?: string; flavour?: string }) {
  const kind = type.replace("urn:entity:", "");
  let nounPool = NOUNS[kind] ?? NOUNS.artist;
  if (kind === "place") {
    const f = opts.flavour ?? "";
    nounPool = f.includes("comedy") ? NOUNS.comedy : /restaurant|food|dining/.test(f) ? NOUNS.food : /bar|cocktail|pub/.test(f) ? NOUNS.bar : NOUNS.venue;
  }
  const adj = pick(r, ADJ);
  const noun = pick(r, nounPool);
  const name = kind === "artist" || kind === "place" ? `The ${adj} ${noun}` : `${adj} ${noun}`;
  const city = cityFor(opts.location);
  const lat = city ? city.lat + (r() - 0.5) * 0.08 : undefined;
  const lon = city ? city.lon + (r() - 0.5) * 0.08 : undefined;
  return {
    entity_id: `MOCK-${slug(kind)}-${hash(seed + name).toString(16)}`,
    name,
    types: [type],
    subtype: kind === "place" ? `urn:entity:place:${slug(opts.flavour || "music_venue")}` : undefined,
    popularity: round(0.4 + r() * 0.59),
    location: lat !== undefined ? { lat, lon } : undefined,
    properties: {
      short_description: `Mock ${kind.replace("_", " ")} generated for offline development.`,
      address: city ? `${Math.floor(r() * 900) + 100} ${pick(r, ["Main St", "Market St", "High St", "Station Rd", "MG Road", "Park Ave"])}, ${city.name}` : undefined,
      price_level: kind === "place" ? 1 + Math.floor(r() * 3) : undefined,
      business_rating: kind === "place" ? round(3.8 + r() * 1.1) : undefined,
    },
    query: { affinity: round(0.55 + r() * 0.44) },
    tags: Array.from({ length: 3 }, () => {
      const t = pick(r, TASTE_TAGS);
      return { id: `urn:tag:keyword:mock:${slug(t)}`, name: t, type: "urn:tag:keyword:qloo" };
    }),
    mock: true,
  };
}

export function mockQloo(path: string, params: QParams): unknown {
  const p = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, v === undefined || v === null ? "" : String(v)]));
  const seed = JSON.stringify(p) + path;
  const r = rng(seed);
  const take = Math.min(Number(p.take || 10), 50);

  if (path === "/search") {
    const q = p.query || "Unknown";
    const type = (p.types || "urn:entity:artist").split(",")[0];
    return {
      results: [0, 1, 2].map((i) => ({
        entity_id: `MOCK-${slug(type.replace("urn:entity:", ""))}-${hash(q.toLowerCase() + i).toString(16)}`,
        name: i === 0 ? title(q) : `${title(q)} ${i === 1 ? "(Live)" : "Tribute"}`,
        types: [type],
        popularity: round(i === 0 ? 0.92 : 0.3 - i * 0.1),
        properties: { short_description: "Mock search result — add QLOO_API_KEY for real data." },
        tags: [],
        mock: true,
      })),
    };
  }

  if (path === "/v2/tags") {
    const q = p["filter.query"] || "music";
    return {
      results: {
        tags: [{ id: `urn:tag:category:mock:${slug(q)}`, name: title(q), type: "urn:tag:category:place", mock: true }],
      },
    };
  }

  if (path === "/v2/insights/compare") {
    return {
      results: {
        tags: Array.from({ length: 6 }, () => {
          const t = pick(r, TASTE_TAGS);
          return { tag_id: `urn:tag:keyword:mock:${slug(t)}`, name: t, a: { affinity: round(r()) }, b: { affinity: round(r()) } };
        }),
      },
    };
  }

  if (path === "/v2/trending") {
    return {
      results: {
        trending: Array.from({ length: 12 }, (_, i) => ({ date: `2026-W${String(28 + i).padStart(2, "0")}`, popularity: round(0.4 + i * 0.03 + r() * 0.08) })),
      },
    };
  }

  // ---- /v2/insights ----
  const type = p["filter.type"];
  const signalSeed = (p["signal.interests.entities"] || p["signal.interests.tags"] || "x") + (p["signal.location.query"] || "");

  if (type === "urn:tag") {
    const tr = rng(signalSeed + "tags");
    const chosen = new Set<string>();
    while (chosen.size < Math.min(take, 14)) chosen.add(pick(tr, TASTE_TAGS));
    return {
      results: {
        tags: [...chosen].map((t, i) => ({ id: `urn:tag:keyword:mock:${slug(t)}`, name: t, type: "urn:tag:keyword:qloo", query: { affinity: round(0.98 - i * 0.05) } })),
      },
    };
  }

  if (type === "urn:demographics") {
    const dr = rng(signalSeed + "demo");
    const v = () => round(dr() * 1.1 - 0.5);
    return {
      results: {
        demographics: [
          {
            entity_id: p["signal.interests.entities"]?.split(",")[0],
            query: {
              age: { "24_and_younger": v(), "25_to_29": v(), "30_to_34": v(), "35_to_44": v(), "45_to_54": v(), "55_and_older": v() },
              gender: { male: v(), female: v() },
            },
          },
        ],
      },
    };
  }

  if (type === "urn:heatmap") {
    const loc = (p["filter.location.query"] || "").toLowerCase();
    const code = COUNTRY_CODES[loc];
    const cities = allCities().filter((c) => c.country === code);
    const heatmap = cities.flatMap((city) => {
      const cr = rng(signalSeed + city.name);
      const base = cr() ** 1.6; // skewed: a few hot cities, many lukewarm
      return Array.from({ length: 3 + Math.floor(cr() * 4) }, () => ({
        location: { latitude: city.lat + (cr() - 0.5) * 0.5, longitude: city.lon + (cr() - 0.5) * 0.5 },
        query: { affinity: round(Math.min(1, Math.max(0, base + (cr() - 0.5) * 0.15))), popularity: round(cr()) },
      }));
    });
    return { results: { heatmap } };
  }

  if (type === "urn:audience") {
    const parents = p["filter.parents.types"];
    const pool = AUDIENCES.filter(([, parent]) => !parents || parents.includes(parent));
    const ar = rng(signalSeed + "aud");
    return {
      results: {
        entities: pool.slice(0, take).map(([name, parent]) => ({
          entity_id: `urn:audience:mock:${slug(name)}`,
          name,
          types: ["urn:audience"],
          parents: [{ type: parent }],
          query: { affinity: round(0.5 + ar() * 0.49) },
        })),
      },
    };
  }

  if (type?.startsWith("urn:entity:")) {
    const flavour = (p["filter.tags"] || "").toLowerCase();
    const location = p["filter.location.query"] || p["signal.location.query"];
    const seen = new Set<string>();
    const entities = [];
    for (let i = 0; entities.length < take && i < take * 4; i++) {
      const e = mockEntity(type, r, seed + i, { location, flavour });
      if (seen.has(e.name)) continue;
      seen.add(e.name);
      entities.push(e);
    }
    entities.sort((a, b) => b.query.affinity - a.query.affinity);
    return { results: { entities } };
  }

  return { results: {} };
}
