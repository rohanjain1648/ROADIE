import { kvIncr } from "./cache";
import { env } from "./env";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/** Daily fixed-window limit per IP and bucket. */
export async function checkRateLimit(req: Request, bucket: string, limit = env.rateLimitPerDay) {
  const day = new Date().toISOString().slice(0, 10);
  const count = await kvIncr(`rl:${bucket}:${clientIp(req)}:${day}`, 60 * 60 * 26);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), limit };
}
