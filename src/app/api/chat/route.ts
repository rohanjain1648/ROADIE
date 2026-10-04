import { z } from "zod";
import { runChat } from "@/lib/agent/chat";
import type { TourPlan } from "@/lib/agent/types";
import { kvGet } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(20),
  tourId: z.string().max(40).optional(),
  tour: z.any().optional(),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const limit = await checkRateLimit(request, "chat", 80);
  if (!limit.ok) return Response.json({ error: "Daily chat limit reached" }, { status: 429 });

  const plan = parsed.data.tourId ? await kvGet<TourPlan>(`tour:${parsed.data.tourId}`) : null;
  const context = plan ?? (parsed.data.tour as TourPlan | undefined) ?? null;
  try {
    return Response.json(await runChat(parsed.data.messages, context));
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Chat failed" }, { status: 500 });
  }
}
