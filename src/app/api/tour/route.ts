import { runTourAgent } from "@/lib/agent/pipeline";
import { TourRequestSchema, type AgentEvent } from "@/lib/agent/types";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/tour → Server-Sent Events stream of AgentEvents, ending in `done`.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = TourRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }
  if (parsed.data.endDate < parsed.data.startDate) {
    return Response.json({ error: "endDate must be after startDate" }, { status: 400 });
  }

  const limit = await checkRateLimit(request, "tour");
  if (!limit.ok) {
    return Response.json({ error: `Daily limit of ${limit.limit} tour runs reached — try a demo tour instead.` }, { status: 429 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e: AgentEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 10000);
      try {
        const plan = await runTourAgent(parsed.data, send);
        send({ type: "done", plan });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Agent failed" });
      } finally {
        clearInterval(ping);
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
