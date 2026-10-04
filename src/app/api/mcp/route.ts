import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createRoadieMcpServer } from "@/lib/mcp/server";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Stateless MCP over Streamable HTTP: a fresh server + transport per request.
async function handle(request: Request) {
  if (request.method === "POST") {
    const limit = await checkRateLimit(request, "mcp", 300);
    if (!limit.ok) return Response.json({ error: "Daily MCP limit reached" }, { status: 429 });
  }
  const server = createRoadieMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(request);
}

export const POST = handle;
export const GET = handle;
export const DELETE = handle;
