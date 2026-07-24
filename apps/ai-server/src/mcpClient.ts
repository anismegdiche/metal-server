//
//
//
import { Logger } from "@metal/logger"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import type { ChatCompletionTool } from "./agent"

//
export type MetalMcpClient = Client

export type McpConnection = {
	client: MetalMcpClient
	tools: ChatCompletionTool[]
}

export async function createMcpClient(options: {
	mcpServerUrl: string
	mcpAuthToken?: string
}): Promise<McpConnection> {
	const { mcpServerUrl, mcpAuthToken } = options

	const headers: Record<string, string> = {}
	if (mcpAuthToken) {
		headers.Authorization = `Bearer ${mcpAuthToken}`
	}

	const client = new Client(
		{ name: "metal-ai-server", version: "1.0.0" },
		{ capabilities: {} },
	)

	const transport = new StreamableHTTPClientTransport(new URL(mcpServerUrl), {
		requestInit: { headers },
	})

	await client.connect(transport)

	const mcpTools = await client.listTools()

	const tools: ChatCompletionTool[] = mcpTools.tools.map((tool) => ({
		type: "function" as const,
		function: {
			name: tool.name,
			description: tool.description ?? "",
			parameters: tool.inputSchema,
		},
	}))

	Logger.Info(`[MCP] Connected to ${mcpServerUrl} — ${tools.length} tools available`)
	for (const tool of tools) {
		Logger.Debug(`[MCP]   - ${tool.function.name}: ${tool.function.description}`)
	}

	return { client, tools }
}
