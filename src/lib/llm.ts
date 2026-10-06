import OpenAI from "openai";
import type { ZodType } from "zod";
import { env } from "./env";

// One OpenAI-SDK client for both providers: Groq exposes an OpenAI-compatible
// endpoint, so switching is just baseURL + key + model. With no key at all we
// fall back to deterministic templates ("mock" provider) so the app still runs.

let client: OpenAI | null = null;
let clientProvider: string | null = null;

export function llmClient(): OpenAI | null {
  const provider = env.llmProvider;
  if (provider === "mock") return null;
  if (client && clientProvider === provider) return client;
  // maxRetries: the SDK backs off on 429s, which Groq's free tier hits under parallel city planning.
  client =
    provider === "groq"
      ? new OpenAI({ apiKey: env.groqApiKey, baseURL: "https://api.groq.com/openai/v1", maxRetries: 4, timeout: 45000 })
      : new OpenAI({ apiKey: env.openaiApiKey, maxRetries: 3, timeout: 60000 });
  clientProvider = provider;
  return client;
}

export function llmModel(): string {
  return env.llmProvider === "groq" ? env.groqModel : env.openaiModel;
}

/** Reasoning-style OpenAI models reject a custom temperature. */
function temperatureFor(model: string, t: number) {
  return /^(o\d|gpt-5)/.test(model) ? {} : { temperature: t };
}

// Groq's free tier allows ~8k tokens/min; unbounded parallel city calls just trigger 429 backoff storms.
const maxConcurrent = Number(process.env.LLM_CONCURRENCY ?? (env.llmProvider === "groq" ? 2 : 6));
let active = 0;
const waiting: Array<() => void> = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= maxConcurrent) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/** gpt-oss reasoning tokens count against TPM; "low" keeps planning calls cheap and fast. */
function reasoningFor(model: string) {
  return /gpt-oss/.test(model) ? { reasoning_effort: "low" as const } : {};
}

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
    throw new Error("No JSON object in model output");
  }
}

export interface JsonCallOptions<T> {
  system: string;
  user: string;
  schema: ZodType<T>;
  fallback: () => T;
  temperature?: number;
}

/**
 * Ask the model for a JSON object validated by `schema`. One repair retry on
 * invalid output, then the deterministic `fallback` — the pipeline never dies
 * because a model got creative with its formatting.
 */
export async function chatJSON<T>(opts: JsonCallOptions<T>): Promise<{ data: T; source: "llm" | "fallback" }> {
  const c = llmClient();
  if (!c) return { data: opts.fallback(), source: "fallback" };
  const model = llmModel();
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: `${opts.system}\n\nRespond with a single valid JSON object only.` },
    { role: "user", content: opts.user },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await withSlot(() =>
        c.chat.completions.create({
          model,
          messages,
          response_format: { type: "json_object" },
          ...temperatureFor(model, opts.temperature ?? 0.6),
          ...reasoningFor(model),
        }),
      );
      const text = res.choices[0]?.message?.content ?? "";
      const parsed = opts.schema.safeParse(extractJson(text));
      if (parsed.success) return { data: parsed.data, source: "llm" };
      messages.push({ role: "assistant", content: text });
      messages.push({
        role: "user",
        content: `That JSON failed validation: ${parsed.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}. Return the corrected JSON object only.`,
      });
    } catch (err) {
      console.error("[llm] chatJSON error", err instanceof Error ? err.message : err);
      if (attempt === 1) break;
    }
  }
  return { data: opts.fallback(), source: "fallback" };
}

export type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export interface ToolLoopResult {
  answer: string;
  steps: Array<{ tool: string; args: Record<string, unknown>; ok: boolean; preview: string }>;
}

/** Classic function-calling loop (works on Groq + OpenAI). */
export async function runToolLoop(opts: {
  system: string;
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  handlers: Record<string, ToolHandler>;
  maxSteps?: number;
}): Promise<ToolLoopResult> {
  const c = llmClient();
  const steps: ToolLoopResult["steps"] = [];
  if (!c) {
    return {
      answer:
        "Chat needs an LLM key. Add GROQ_API_KEY (free tier at console.groq.com) or OPENAI_API_KEY to .env.local and restart.",
      steps,
    };
  }
  const model = llmModel();
  const convo: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    ...opts.messages,
  ];

  for (let i = 0; i < (opts.maxSteps ?? 6); i++) {
    const res = await c.chat.completions.create({
      model,
      messages: convo,
      tools: opts.tools,
      tool_choice: "auto",
      ...temperatureFor(model, 0.3),
      ...reasoningFor(model),
    });
    const msg = res.choices[0]?.message;
    if (!msg) break;
    const calls = msg.tool_calls ?? [];
    if (!calls.length) return { answer: msg.content ?? "", steps };

    // Echo back only the standard fields — Groq rejects OpenAI-only extras (refusal, annotations…).
    convo.push({ role: "assistant", content: msg.content ?? null, tool_calls: calls });
    for (const call of calls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        /* keep empty */
      }
      const handler = opts.handlers[call.function.name];
      let content: string;
      let ok = true;
      try {
        if (!handler) throw new Error(`Unknown tool ${call.function.name}`);
        content = JSON.stringify(await handler(args)).slice(0, 6000);
      } catch (err) {
        ok = false;
        content = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
      }
      steps.push({ tool: call.function.name, args, ok, preview: content.slice(0, 240) });
      convo.push({ role: "tool", tool_call_id: call.id, content });
    }
  }
  // Out of steps: ask for a final answer without tools.
  const final = await c.chat.completions.create({
    model,
    messages: [...convo, { role: "user", content: "Summarise your findings for me now." }],
    ...temperatureFor(model, 0.3),
  });
  return { answer: final.choices[0]?.message?.content ?? "", steps };
}
