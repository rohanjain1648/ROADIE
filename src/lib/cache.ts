import { env } from "./env";

// Two-tier key/value store: in-process LRU always, Upstash Redis (REST) when
// configured. Upstash is what makes share links + caching survive serverless
// cold starts on Vercel.

const MAX_ENTRIES = 2000;
const memory = new Map<string, { value: string; expires: number }>();

function memGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) {
    memory.delete(key);
    return null;
  }
  // refresh LRU position
  memory.delete(key);
  memory.set(key, hit);
  return hit.value;
}

function memSet(key: string, value: string, ttlSeconds: number) {
  if (memory.size >= MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest) memory.delete(oldest);
  }
  memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

const hasUpstash = () => Boolean(env.upstashUrl && env.upstashToken);

async function upstash(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(env.upstashUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.upstashToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const local = memGet(key);
  if (local !== null) return JSON.parse(local) as T;
  if (!hasUpstash()) return null;
  try {
    const remote = (await upstash(["GET", key])) as string | null;
    if (remote === null || remote === undefined) return null;
    memSet(key, remote, 3600);
    return JSON.parse(remote) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown, ttlSeconds = 86400): Promise<void> {
  const raw = JSON.stringify(value);
  memSet(key, raw, ttlSeconds);
  if (!hasUpstash()) return;
  try {
    await upstash(["SET", key, raw, "EX", ttlSeconds]);
  } catch {
    // cache writes are best-effort
  }
}

/** Fixed-window counter. Returns the count after increment. */
export async function kvIncr(key: string, ttlSeconds: number): Promise<number> {
  if (hasUpstash()) {
    try {
      const n = Number(await upstash(["INCR", key]));
      if (n === 1) await upstash(["EXPIRE", key, ttlSeconds]);
      return n;
    } catch {
      // fall through to memory
    }
  }
  const current = Number(memGet(key) ?? 0) + 1;
  memSet(key, String(current), ttlSeconds);
  return current;
}
