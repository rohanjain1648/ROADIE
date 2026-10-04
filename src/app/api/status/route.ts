import { runtimeMode } from "@/lib/env";

export async function GET() {
  return Response.json(runtimeMode());
}
