//
//
//
import { Logger } from "@metal/logger"
import express from "express"
import type { Request, Response } from "express"
//
import type { Agent } from "./agent"
import type { ChatCompletionTool } from "./agent"
import type { ConversationStore } from "./conversationStore"
import type { MetalMcpClient } from "./mcpClient"

//
export type ChatRequestBody = {
	conversationId?: string
	message: string
}

export type ChatResponse = {
	conversationId: string
	reply: string
	toolCalls: Array<{
		name: string
		args: unknown
		result: string
		duration: number
	}>
}

type ServerOptions = {
	mcpClient: MetalMcpClient | null
	tools: ChatCompletionTool[]
	store: ConversationStore
	mcpConnected: boolean
}

export function createServer(options: ServerOptions): express.Express {
	const { mcpClient, tools, store, mcpConnected } = options

	const app = express()
	app.use(express.json())

	app.get("/health", (_req: Request, res: Response) => {
		res.json({
			status: "ok",
			mcpConnected,
			toolsCount: tools.length,
			conversations: store.list().length,
		})
	})

	app.get("/conversations", (_req: Request, res: Response) => {
		const list = store.list().map((c) => ({
			id: c.id,
			title: c.title,
			createdAt: c.createdAt,
			updatedAt: c.updatedAt,
			messageCount: c.messages.length,
		}))
		res.json(list)
	})

	app.get("/conversations/:id", (req: Request, res: Response) => {
		const id = String(req.params.id ?? "")
		const conv = store.get(id)
		if (!conv) {
			res.status(404).json({ error: "Conversation not found" })
			return
		}
		res.json(conv)
	})

	app.delete("/conversations/:id", (req: Request, res: Response) => {
		const id = String(req.params.id ?? "")
		if (!store.get(id)) {
			res.status(404).json({ error: "Conversation not found" })
			return
		}
		store.delete(id)
		res.json({ deleted: true })
	})

	app.post("/chat", async (req: Request, res: Response) => {
		await handleChat(req, res, { mcpClient, tools, store })
	})

	app.post("/chat/stream", async (req: Request, res: Response) => {
		await handleChatStream(req, res, { mcpClient, tools, store })
	})

	return app
}

async function handleChat(
	req: Request,
	res: Response,
	options: {
		mcpClient: MetalMcpClient | null
		tools: ChatCompletionTool[]
		store: ConversationStore
	},
) {
	const body = req.body as ChatRequestBody

	if (!body.message || typeof body.message !== "string") {
		res.status(400).json({ error: "message is required and must be a string" })
		return
	}

	if (!options.mcpClient) {
		res.status(503).json({
			error: "MCP server is not connected. Cannot process tool calls.",
		})
		return
	}

	try {
		let conversationId: string
		let agent: Agent

		if (body.conversationId) {
			const result = options.store.getOrCreate(body.conversationId)
			if (!result.agent) {
				res.status(404).json({ error: `Conversation '${body.conversationId}' not found` })
				return
			}
			conversationId = result.conversationId
			agent = result.agent
		} else {
			const firstMessage = { role: "user" as const, content: body.message }
			const result = options.store.create(body.message, firstMessage)
			conversationId = result.conversationId
			agent = result.agent
		}

		Logger.Info(`[Server] Chat request conversation=${conversationId} message="${body.message.slice(0, 100)}"`)

		const startMs = Date.now()
		const response = await agent.run(body.message)
		const duration = Date.now() - startMs

		options.store.saveMessages(conversationId, agent.getMessages())

		Logger.Info(`[Server] Chat response conversation=${conversationId} duration=${duration}ms toolCalls=${response.toolCalls.length} reply_length=${response.reply.length}`)

		const chatResponse: ChatResponse = {
			conversationId,
			reply: response.reply,
			toolCalls: response.toolCalls,
		}

		res.json(chatResponse)
	} catch (error) {
		handleChatError(error, res)
	}
}

function handleChatError(error: unknown, res: Response) {
	Logger.Error(`[Server] Chat error: ${error}`)

	if (error instanceof Error) {
		const message = error.message.toLowerCase()
		if (message.includes("429")) {
			res.status(429).json({ error: "Model API rate limit exceeded. Please retry later." })
			return
		}
		if (message.includes("timeout") || message.includes("econnrefused")) {
			res.status(502).json({ error: `Model API error: ${error.message}` })
			return
		}
	}

	res.status(500).json({ error: "Internal server error" })
}

async function handleChatStream(
	req: Request,
	res: Response,
	options: {
		mcpClient: MetalMcpClient | null
		tools: ChatCompletionTool[]
		store: ConversationStore
	},
) {
	const body = req.body as ChatRequestBody

	if (!body.message || typeof body.message !== "string") {
		res.status(400).json({ error: "message is required and must be a string" })
		return
	}

	if (!options.mcpClient) {
		res.status(503).json({
			error: "MCP server is not connected. Cannot process tool calls.",
		})
		return
	}

	let conversationId: string
	let agent: Agent

	if (body.conversationId) {
		const result = options.store.getOrCreate(body.conversationId)
		if (!result.agent) {
			res.status(404).json({ error: `Conversation '${body.conversationId}' not found` })
			return
		}
		conversationId = result.conversationId
		agent = result.agent
	} else {
		const firstMessage = { role: "user" as const, content: body.message }
		const result = options.store.create(body.message, firstMessage)
		conversationId = result.conversationId
		agent = result.agent
	}

	Logger.Info(`[Server] Chat stream request conversation=${conversationId} message="${body.message.slice(0, 100)}"`)

	res.writeHead(200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive",
		"X-Accel-Buffering": "no",
	})

	const sendEvent = (event: string, data: unknown) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
	}

	try {
		const startMs = Date.now()

		sendEvent("start", { conversationId })

		const stream = agent.runStream(body.message)

		for await (const event of stream) {
			sendEvent(event.type, event)
		}

		options.store.saveMessages(conversationId, agent.getMessages())

		const duration = Date.now() - startMs
		Logger.Info(`[Server] Chat stream done conversation=${conversationId} duration=${duration}ms`)

		res.write("event: end\ndata: {}\n\n")
	} catch (error) {
		Logger.Error(`[Server] Chat stream error: ${error}`)
		const message = error instanceof Error ? error.message : "Internal server error"
		sendEvent("error", { message })
	} finally {
		res.end()
	}
}
