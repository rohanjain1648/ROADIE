import type OpenAI from "openai";
import { runToolLoop } from "../llm";
import { QlooClient } from "../qloo/client";
import { QlooTools } from "../qloo/tools";
import type { QCall } from "../qloo/types";
import { makeToolHandlers, openAiTools } from "./toolDefs";
import type { TourPlan } from "./types";

// "Ask ROADIE": a genuine tool-calling agent. The model decides which Qloo
// tools to call (search → recommend → compare …) to answer follow-ups about a
// tour, e.g. "swap Denver for a city with a better comedy scene".

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function tourContext(plan?: Pick<TourPlan, "artist" | "stops" | "persona" | "request"> | null) {
  if (!plan) return "No tour loaded yet.";
  return `Current tour for ${plan.artist.name} (Qloo id ${plan.artist.id}), ${plan.request.kind}, region ${plan.request.region}.
Persona: ${plan.persona.headline}.
Stops: ${plan.stops.map((s) => `${s.date} ${s.city} @ ${s.venue.pick?.name ?? "TBD"}`).join("; ")}`;
}

export async function runChat(messages: ChatMessage[], plan?: Pick<TourPlan, "artist" | "stops" | "persona" | "request"> | null) {
  const calls: QCall[] = [];
  const q = new QlooTools(new QlooClient({ onCall: (c) => calls.push(c) }));
  const system = `You are ROADIE, an AI tour manager grounded in Qloo's cultural taste graph.
Use the tools to fetch real data before answering — never guess venues, artists, brands or affinities.
Workflow: resolve names with search_entity → use IDs with recommend / taste_tags / city_heat / compare.
Answer concisely in markdown, cite affinity scores, and mention the city for any place.
${tourContext(plan)}`;

  const result = await runToolLoop({
    system,
    messages: messages.slice(-10) as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: openAiTools(),
    handlers: makeToolHandlers(q),
    maxSteps: 6,
  });
  return { ...result, qlooCalls: calls.length };
}
