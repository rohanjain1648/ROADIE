import { runBaseline } from "@/lib/agent/baseline";
import { TourRequestSchema } from "@/lib/agent/types";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const parsed = TourRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const limit = await checkRateLimit(request, "baseline");
  if (!limit.ok) return Response.json({ error: "Daily limit reached" }, { status: 429 });
  try {
    return Response.json(await runBaseline(parsed.data));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Baseline failed" }, { status: 500 });
  }
}
