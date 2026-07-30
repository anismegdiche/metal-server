//
//
//
import "dotenv/config"
import { Logger, VERBOSITY } from "@metal/logger"
import type { ChatCompletionTool } from "./agent"
import { ConversationStore } from "./conversationStore"
import type { MetalMcpClient } from "./mcpClient"
import { createMcpClient } from "./mcpClient"
import { createServer } from "./server"

//
async function main() {
	const model = process.env.LLM_MODEL ?? "llama3-groq-tool-use:8b"
	const llmBaseUrl = process.env.LLM_BASE_URL
	if (!llmBaseUrl) {
		throw new Error("LLM_BASE_URL is required")
	}
	const mcpServerUrl = process.env.MCP_SERVER_URL ?? "http://127.0.0.1:3000/mcp"
	const mcpAuthToken = process.env.MCP_AUTH_TOKEN
	const port = Number(process.env.PORT ?? 3001)

	Logger.Init("metal-ai-server")
	Logger.SetLevel(VERBOSITY.DEBUG)
	Logger.Info("[AI Server] Starting...")

	Logger.Info(`[AI Server] Model: ${model} (LLM at ${llmBaseUrl})`)
	Logger.Info(`[AI Server] MCP Server: ${mcpServerUrl}`)

	let mcpClient: MetalMcpClient | null = null
	let mcpTools: ChatCompletionTool[] = []
	let mcpConnected = false

	try {
		const connection = await createMcpClient({
			mcpServerUrl,
			mcpAuthToken,
		})
		mcpClient = connection.client
		mcpTools = connection.tools
		mcpConnected = true
	} catch (error) {
		Logger.Error(`[AI Server] Failed to connect to MCP server: ${error instanceof Error ? error.message : error}`)
		Logger.Error("[AI Server] Starting without MCP — /chat will return 503 until MCP is reachable")
	}

	if (!mcpClient) {
		Logger.Error("[AI Server] Cannot start without MCP client.")
		process.exit(1)
	}

	const store = new ConversationStore({
		dbPath: "/data/conversations",
		mcpClient,
		tools: mcpTools,
		model,
		llmBaseUrl,
	})

	const app = createServer({
		mcpClient,
		tools: mcpTools,
		store,
		mcpConnected,
	})

	app.listen(port, () => {
		Logger.Info(`[AI Server] Listening on http://127.0.0.1:${port}`)
		Logger.Info(`[AI Server] Health: http://127.0.0.1:${port}/health`)
		Logger.Info(`[AI Server] Chat:   POST http://127.0.0.1:${port}/chat`)
	})
}

main().catch((error) => {
	Logger.Error(`[AI Server] Fatal error: ${error}`)
	process.exit(1)
})
