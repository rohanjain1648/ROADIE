// Central runtime configuration. Everything is optional so the app boots in
// "mock mode" with zero keys — handy before the Qloo hackathon key arrives.

export type LlmProvider = "groq" | "openai" | "mock";

function pickProvider(): LlmProvider {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (forced === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (forced === "mock") return "mock";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "mock";
}

export const env = {
  qlooApiKey: process.env.QLOO_API_KEY ?? "",
  qlooBaseUrl: (process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com").replace(/\/$/, ""),
  get qlooMock() {
    return !this.qlooApiKey || process.env.QLOO_MOCK === "1";
  },

  get llmProvider(): LlmProvider {
    return pickProvider();
  },
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",

  upstashUrl: process.env.UPSTASH_REDIS_REST_URL ?? "",
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",

  // Max tour runs per IP per day (protects LLM + Qloo budgets once deployed).
  rateLimitPerDay: Number(process.env.RATE_LIMIT_PER_DAY ?? 25),
};

export function runtimeMode() {
  return {
    qloo: env.qlooMock ? "mock" : "live",
    llm: env.llmProvider,
    llmModel:
      env.llmProvider === "groq" ? env.groqModel : env.llmProvider === "openai" ? env.openaiModel : "template",
  } as const;
}
