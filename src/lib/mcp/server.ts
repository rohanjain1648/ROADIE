import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TOOL_DEFS, makeToolHandlers, type ToolName } from "../agent/toolDefs";

// ROADIE's Qloo taste tools as an MCP server — "wire Qloo into an agent you
// already have". Served over Streamable HTTP at /api/mcp and over stdio via
// `npm run mcp` (for Claude Desktop / Cursor configs).

export function createRoadieMcpServer() {
  const server = new McpServer({ name: "roadie-qloo-taste", version: "1.0.0" });
  const handlers = makeToolHandlers();

  for (const name of Object.keys(TOOL_DEFS) as ToolName[]) {
    const def = TOOL_DEFS[name];
    server.registerTool(
      `qloo_${name}`,
      { title: name.replace(/_/g, " "), description: def.description, inputSchema: def.schema },
      async (args: unknown) => {
        try {
          const result = await handlers[name](args);
          return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          return {
            isError: true,
            content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
          };
        }
      },
    );
  }
  return server;
}
