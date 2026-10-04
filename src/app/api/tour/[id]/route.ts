import type { NextRequest } from "next/server";
import type { TourPlan } from "@/lib/agent/types";
import { kvGet } from "@/lib/cache";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[a-z0-9-]{4,40}$/i.test(id)) return Response.json({ error: "Bad id" }, { status: 400 });
  const plan = await kvGet<TourPlan>(`tour:${id}`);
  if (!plan) return Response.json({ error: "Tour not found (share links need Upstash configured in production)" }, { status: 404 });
  return Response.json(plan);
}
