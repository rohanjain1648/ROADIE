import { z } from "zod";
import { env, runtimeMode } from "../env";
import { getRegion } from "../geo/cities";
import { chatJSON } from "../llm";
import { QlooTools } from "../qloo/tools";
import type { EntityType } from "../qloo/types";
import type { TourRequest } from "./types";

// "Without Qloo" arm: the same brief answered by the bare LLM, then every name
// it produced is fact-checked against Qloo's entity search. This is the
// on-screen proof that cultural grounding is the difference.

export const BaselineSchema = z.object({
  cities: z
    .array(
      z.object({
        city: z.string(),
        venue: z.string(),
        opener: z.string(),
        restaurant: z.string(),
        brandPartner: z.string(),
        reason: z.string(),
      }),
    )
    .min(1)
    .max(12),
});
export type BaselineOut = z.infer<typeof BaselineSchema>;

export type VerifyStatus = "verified" | "not-found" | "unchecked";

export interface BaselineCheck {
  city: string;
  field: "venue" | "opener" | "restaurant" | "brandPartner";
  name: string;
  status: VerifyStatus;
  match?: string;
}

export interface BaselineResult {
  request: TourRequest;
  cities: BaselineOut["cities"];
  checks: BaselineCheck[];
  summary: { checked: number; verified: number; notFound: number; verifiedRate: number | null };
  mode: ReturnType<typeof runtimeMode>;
  available: boolean;
  note?: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function namesMatch(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length < y.length ? [x, y] : [y, x];
  return long.includes(short) && short.length / long.length > 0.6;
}

export async function runBaseline(req: TourRequest, tools = new QlooTools()): Promise<BaselineResult> {
  const region = getRegion(req.region);
  const mode = runtimeMode();
  if (mode.llm === "mock") {
    return {
      request: req,
      cities: [],
      checks: [],
      summary: { checked: 0, verified: 0, notFound: 0, verifiedRate: null },
      mode,
      available: false,
      note: "Add GROQ_API_KEY or OPENAI_API_KEY to run the LLM-only comparison.",
    };
  }

  const { data } = await chatJSON<BaselineOut>({
    system: "You are an experienced tour manager. Answer from your own knowledge.",
    user: `Plan a ${req.shows}-city ${req.kind === "comedy" ? "comedy" : "music"} tour in ${region.label} for "${req.artist}" between ${req.startDate} and ${req.endDate}, ${req.capacity}-capacity rooms.
For each city give one specific real venue, one specific local opener/support act, one specific restaurant for a pre-show dinner, one brand sponsor, and a one-sentence reason.
Return JSON: {"cities":[{"city":"","venue":"","opener":"","restaurant":"","brandPartner":"","reason":""}]}`,
    schema: BaselineSchema,
    fallback: () => ({ cities: [] }) as unknown as BaselineOut,
    temperature: 0.7,
  });

  const fieldType: Record<BaselineCheck["field"], EntityType> = {
    venue: "place",
    restaurant: "place",
    opener: req.kind === "comedy" ? "person" : "artist",
    brandPartner: "brand",
  };

  const items: BaselineCheck[] = data.cities.flatMap((c) =>
    (["venue", "opener", "restaurant", "brandPartner"] as const).map((field) => ({
      city: c.city,
      field,
      name: c[field],
      status: "unchecked" as VerifyStatus,
    })),
  );

  if (!env.qlooMock) {
    let cursor = 0;
    await Promise.all(
      Array.from({ length: 6 }, async () => {
        while (cursor < items.length) {
          const item = items[cursor++];
          if (!item.name || /^(n\/?a|none|tbd)$/i.test(item.name)) {
            item.status = "not-found";
            continue;
          }
          try {
            const hits = await tools.searchEntities(item.name, fieldType[item.field], 5);
            const hit = hits.find(
              (h) => namesMatch(h.name, item.name) && (fieldType[item.field] !== "place" || !h.address || norm(h.address).includes(norm(item.city).split(" ")[0])),
            );
            item.status = hit ? "verified" : "not-found";
            item.match = hit?.name;
          } catch {
            item.status = "unchecked";
          }
        }
      }),
    );
  }

  const checked = items.filter((i) => i.status !== "unchecked");
  const verified = checked.filter((i) => i.status === "verified").length;
  return {
    request: req,
    cities: data.cities,
    checks: items,
    summary: {
      checked: checked.length,
      verified,
      notFound: checked.length - verified,
      verifiedRate: checked.length ? verified / checked.length : null,
    },
    mode,
    available: true,
    note: env.qlooMock ? "Verification against Qloo is disabled in mock mode — add QLOO_API_KEY." : undefined,
  };
}
