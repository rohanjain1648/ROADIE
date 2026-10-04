import type { NextRequest } from "next/server";
import { QlooTools } from "@/lib/qloo/tools";
import { ENTITY_TYPES, type EntityType } from "@/lib/qloo/types";

// Autocomplete for the artist field.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const typeParam = request.nextUrl.searchParams.get("type") ?? "artist";
  const type = (ENTITY_TYPES as string[]).includes(typeParam) ? (typeParam as EntityType) : "artist";
  if (q.length < 2) return Response.json({ results: [] });
  try {
    const results = await new QlooTools().searchEntities(q, type, 6);
    return Response.json({
      results: results.map((r) => ({ id: r.id, name: r.name, popularity: r.popularity, image: r.image, description: r.description, mock: r.mock })),
    });
  } catch (err) {
    return Response.json({ results: [], error: err instanceof Error ? err.message : "search failed" }, { status: 502 });
  }
}
