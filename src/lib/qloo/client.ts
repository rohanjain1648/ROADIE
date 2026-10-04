import { kvGet, kvSet } from "../cache";
import { env } from "../env";
import { mockQloo } from "./mock";
import type { QCall, QParams } from "./types";
import { QlooParamError, validateInsightsParams } from "./validate";

// Thin, instrumented HTTP client for the Qloo hackathon API.
//  - X-Api-Key auth, GET + query string only (Insights rejects JSON bodies)
//  - pre-flight param validation (Qloo silently ignores bad params)
//  - 24h response cache (memory + optional Upstash)
//  - one retry with backoff on 429/5xx
//  - every call reported through `onCall` so the UI can show the agent's work

const CACHE_TTL = 60 * 60 * 24;
const TIMEOUT_MS = 15000;

export class QlooError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "QlooError";
  }
}

export interface QlooClientOptions {
  onCall?: (call: QCall) => void;
}

function cleanParams(params: QParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = String(v);
  }
  return out;
}

function cacheKey(path: string, params: Record<string, string>) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return `qloo:${env.qlooMock ? "mock" : "live"}:${path}?${sorted}`;
}

function countResults(json: unknown): number {
  const j = json as { results?: unknown };
  const res = j?.results;
  if (Array.isArray(res)) return res.length;
  if (res && typeof res === "object") {
    for (const v of Object.values(res)) if (Array.isArray(v)) return v.length;
  }
  return 0;
}

let callSeq = 0;

export class QlooClient {
  constructor(private readonly opts: QlooClientOptions = {}) {}

  private report(call: Omit<QCall, "id">) {
    this.opts.onCall?.({ ...call, id: `q${++callSeq}` });
  }

  async get<T = unknown>(path: string, rawParams: QParams): Promise<T> {
    const params = cleanParams(rawParams);
    const started = Date.now();

    if (path === "/v2/insights") {
      try {
        validateInsightsParams(params);
      } catch (err) {
        if (err instanceof QlooParamError) {
          this.report({ endpoint: path, params, ms: 0, status: "rejected", count: 0, error: err.message });
        }
        throw err;
      }
    }

    const key = cacheKey(path, params);
    const cached = await kvGet<T>(key);
    if (cached) {
      this.report({ endpoint: path, params, ms: Date.now() - started, status: "cached", count: countResults(cached) });
      return cached;
    }

    if (env.qlooMock) {
      const json = mockQloo(path, params) as T;
      // Simulate network latency so the trace UI behaves like production.
      await new Promise((r) => setTimeout(r, 60 + Math.random() * 140));
      await kvSet(key, json, CACHE_TTL);
      this.report({ endpoint: path, params, ms: Date.now() - started, status: "mock", count: countResults(json) });
      return json;
    }

    const url = `${env.qlooBaseUrl}${path}?${new URLSearchParams(params).toString()}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          method: "GET",
          headers: { "X-Api-Key": env.qlooApiKey, Accept: "application/json" },
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new QlooError(`Qloo ${res.status} on ${path}`, res.status);
          await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
          continue;
        }
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new QlooError(`Qloo ${res.status} on ${path}: ${body.slice(0, 200)}`, res.status);
        }
        const json = (await res.json()) as T;
        await kvSet(key, json, CACHE_TTL);
        this.report({ endpoint: path, params, ms: Date.now() - started, status: "ok", count: countResults(json) });
        return json;
      } catch (err) {
        lastErr = err;
        if (err instanceof QlooError && err.status && err.status < 500 && err.status !== 429) break;
      } finally {
        clearTimeout(timer);
      }
    }
    const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
    this.report({ endpoint: path, params, ms: Date.now() - started, status: "error", count: 0, error: message });
    throw lastErr instanceof Error ? lastErr : new QlooError(message);
  }
}
