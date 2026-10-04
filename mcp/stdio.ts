// stdio entrypoint for local MCP clients (Claude Desktop, Cursor, …).
//   npm run mcp
// Reads QLOO_API_KEY from the environment (falls back to mock data without it).
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRoadieMcpServer } from "../src/lib/mcp/server";

async function main() {
  const server = createRoadieMcpServer();
  await server.connect(new StdioServerTransport());
  console.error("ROADIE Qloo MCP server running on stdio");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
