//
//
//
import { Logger } from "@metal/logger"
import type { MetalMcpClient } from "./mcpClient"

//
export type ChatCompletionMessage = {
	role: "system" | "user" | "assistant" | "tool"
	content?: string
	tool_calls?: Array<{
		id: string
		type: "function"
		function: { name: string; arguments: string }
	}>
	tool_call_id?: string
	name?: string
}

export type ChatCompletionTool = {
	type: "function"
	function: {
		name: string
		description: string
		parameters: Record<string, unknown>
	}
}

export type ToolCallRecord = {
	name: string
	args: unknown
	result: string
	duration: number
}

export type AgentResponse = {
	reply: string
	toolCalls: ToolCallRecord[]
}

export type StreamEvent =
	| { type: "token"; content: string }
	| { type: "tool_call"; name: string; args: unknown }
	| { type: "tool_result"; name: string; result: string; duration: number }
	| { type: "done"; reply: string; toolCalls: ToolCallRecord[] }
	| { type: "error"; message: string }

const SYSTEM_PROMPT = `You are Metal AI Assistant. You have access to tools that query Metal's data sources, schemas, entities, and plans.

Use these tools to answer user questions about their data. Always use tools to look up actual data rather than guessing or making up answers.

When you have enough information from tool results, provide a clear, concise answer. If a tool call fails, explain the error and suggest what the user might try instead.

Be helpful and direct. Format your answers for readability.`

const MAX_ITERATIONS = 5

//
export class Agent {
	#mcpClient: MetalMcpClient
	#baseUrl: string
	#model: string
	#tools: ChatCompletionTool[]
	#messages: ChatCompletionMessage[] = []

	constructor(options: {
		mcpClient: MetalMcpClient
		tools: ChatCompletionTool[]
		model: string
		llmBaseUrl: string
	}) {
		this.#mcpClient = options.mcpClient
		this.#tools = options.tools
		this.#model = options.model
		this.#baseUrl = options.llmBaseUrl

		this.#messages.push({ role: "system", content: SYSTEM_PROMPT })
	}

	loadMessages(messages: ChatCompletionMessage[]) {
		this.#messages.length = 0
		this.#messages.push(...messages)
	}

	getMessages(): ChatCompletionMessage[] {
		return this.#messages
	}

	async run(userMessage: string): Promise<AgentResponse> {
		this.#messages.push({ role: "user", content: userMessage })

		const allToolCalls: ToolCallRecord[] = []
		let lastTextContent = ""

		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			Logger.Debug(`[Agent] Iteration ${iteration + 1}/${MAX_ITERATIONS}`)

			const response = await this.#chatCompletion()

			const choice = response.choices[0]
			if (!choice) {
				lastTextContent = "No response from model."
				break
			}

			const message = choice.message
			const toolCalls = message.tool_calls

			if (!toolCalls || toolCalls.length === 0) {
				lastTextContent = message.content ?? ""
				break
			}

			this.#pushAssistantMessage(message.content, toolCalls)
			const executed = await this.#executeToolCalls(toolCalls)
			allToolCalls.push(...executed)
		}

		if (allToolCalls.length > 0 && !lastTextContent) {
			lastTextContent = "I've gathered the information but couldn't formulate a response. Please try rephrasing your question."
		}

		return { reply: lastTextContent, toolCalls: allToolCalls }
	}

	async *runStream(userMessage: string): AsyncGenerator<StreamEvent> {
		this.#messages.push({ role: "user", content: userMessage })

		const allToolCalls: ToolCallRecord[] = []
		let lastTextContent = ""

		for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
			Logger.Debug(`[Agent] Stream iteration ${iteration + 1}/${MAX_ITERATIONS}`)

			let content = ""
			const toolCalls: Array<{ id: string; name: string; arguments: string }> = []

			const stream = this.#chatCompletionStream()

			for await (const chunk of stream) {
				if (chunk.content) {
					content += chunk.content
					yield { type: "token", content: chunk.content }
				}
				if (chunk.tool_calls) {
					for (const tc of chunk.tool_calls) {
						const existing = toolCalls.find((t) => t.id === tc.id)
						if (existing) {
							existing.arguments += tc.arguments
						} else {
							toolCalls.push({ id: tc.id, name: tc.name, arguments: tc.arguments })
						}
					}
				}
			}

			if (toolCalls.length === 0) {
				lastTextContent = content
				break
			}

			const fullToolCalls = toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: { name: tc.name, arguments: tc.arguments },
			}))

			this.#pushAssistantMessage(content || null, fullToolCalls)

			for (const tc of toolCalls) {
				const toolArgs = this.#parseToolArgs(tc.arguments)
				yield { type: "tool_call", name: tc.name, args: toolArgs }

				const record = await this.#executeSingleTool(tc.id, tc.name, toolArgs)
				allToolCalls.push(record)

				yield { type: "tool_result", name: record.name, result: record.result, duration: record.duration }
			}
		}

		if (allToolCalls.length > 0 && !lastTextContent) {
			lastTextContent = "I've gathered the information but couldn't formulate a response. Please try rephrasing your question."
		}

		yield { type: "done", reply: lastTextContent, toolCalls: allToolCalls }
	}

	async #chatCompletion(): Promise<{
		choices: Array<{
			message: {
				content: string | null
				tool_calls?: Array<{
					id: string
					type: string
					function: { name: string; arguments: string }
				}>
			}
		}>
	}> {
		const url = `${this.#baseUrl}/v1/chat/completions`

		const body: Record<string, unknown> = {
			model: this.#model,
			messages: this.#messages,
		}

		if (this.#tools.length > 0) {
			body.tools = this.#tools
			body.tool_choice = "auto"
		}

		Logger.Debug(`[Agent] → ${url} model=${this.#model} tools=${this.#tools.length} messages=${this.#messages.length}`)

		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`LLM API error ${res.status}: ${text}`)
		}

		return (await res.json()) as {
			choices: Array<{
				message: {
					content: string | null
					tool_calls?: Array<{
						id: string
						type: string
						function: { name: string; arguments: string }
					}>
				}
			}>
		}
	}

	async *#chatCompletionStream(): AsyncGenerator<{ content: string; tool_calls?: Array<{ id: string; name: string; arguments: string }> }> {
		const url = `${this.#baseUrl}/api/chat`

		const body: Record<string, unknown> = {
			model: this.#model,
			messages: this.#messages,
			stream: true,
		}

		if (this.#tools.length > 0) {
			body.tools = this.#tools
		}

		Logger.Debug(`[Agent] → stream ${url} model=${this.#model} tools=${this.#tools.length} messages=${this.#messages.length}`)

		const res = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})

		if (!res.ok) {
			const text = await res.text()
			throw new Error(`LLM API error ${res.status}: ${text}`)
		}

		const reader = res.body?.getReader()
		if (!reader) throw new Error("No response body")

		const decoder = new TextDecoder()
		let buffer = ""

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			buffer += decoder.decode(value, { stream: true })
			const lines = buffer.split("\n")
			buffer = lines.pop() ?? ""

			for (const line of lines) {
				const trimmed = line.trim()
				if (!trimmed) continue

				try {
					const chunk = JSON.parse(trimmed) as {
						message?: {
							content?: string
							tool_calls?: Array<{
								id: string
								function: { name: string; arguments: string }
							}>
						}
						done?: boolean
					}

					if (chunk.done) return

					if (chunk.message) {
						yield {
							content: chunk.message.content ?? "",
							tool_calls: chunk.message.tool_calls?.map((tc) => ({
								id: tc.id,
								name: tc.function.name,
								arguments: tc.function.arguments,
							})),
						}
					}
				} catch {
					// skip unparseable lines
				}
			}
		}
	}

	#pushAssistantMessage(
		content: string | null | undefined,
		toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>,
	) {
		this.#messages.push({
			role: "assistant",
			content: content ?? undefined,
			tool_calls: toolCalls.map((tc) => ({
				id: tc.id,
				type: "function" as const,
				function: {
					name: tc.function.name,
					arguments: tc.function.arguments,
				},
			})),
		})
	}

	async #executeToolCalls(
		toolCalls: Array<{ id: string; function: { name: string; arguments: string } }>,
	): Promise<ToolCallRecord[]> {
		const records: ToolCallRecord[] = []

		for (const tc of toolCalls) {
			const toolName = tc.function.name
			const toolArgs = this.#parseToolArgs(tc.function.arguments)
			const record = await this.#executeSingleTool(tc.id, toolName, toolArgs)
			records.push(record)
		}

		return records
	}

	#parseToolArgs(rawArgs: string): unknown {
		try {
			return JSON.parse(rawArgs)
		} catch {
			return rawArgs
		}
	}

	async #executeSingleTool(toolCallId: string, toolName: string, toolArgs: unknown): Promise<ToolCallRecord> {
		const toolStart = Date.now()
		const toolResult = await this.#callToolSafely(toolName, toolArgs)
		const toolDuration = Date.now() - toolStart

		this.#messages.push({
			role: "tool",
			tool_call_id: toolCallId ?? "",
			content: toolResult,
			name: toolName,
		})

		Logger.Debug(`[Agent] Tool: ${toolName} args=${JSON.stringify(toolArgs)} duration=${toolDuration}ms result_length=${toolResult.length}`)

		return {
			name: toolName,
			args: toolArgs,
			result: toolResult.length > 500 ? `${toolResult.slice(0, 500)}...` : toolResult,
			duration: toolDuration,
		}
	}

	async #callToolSafely(toolName: string, toolArgs: unknown): Promise<string> {
		try {
			const result = await this.#mcpClient.callTool({
				name: toolName,
				arguments: toolArgs as Record<string, unknown>,
			})
			return this.#formatToolResult(result)
		} catch (error) {
			return `Error: ${error instanceof Error ? error.message : String(error)}`
		}
	}

	#formatToolResult(result: unknown): string {
		if (result && typeof result === "object" && "content" in result) {
			const content = (result as { content: Array<{ type: string; text?: string }> }).content
			if (Array.isArray(content)) {
				return content
					.filter((c) => c.type === "text" && c.text)
					.map((c) => c.text)
					.join("\n")
			}
		}
		return JSON.stringify(result)
	}
}
