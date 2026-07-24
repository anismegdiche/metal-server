import PersistentMap from "@metal/persistent-map"
import type { ChatCompletionMessage, ChatCompletionTool } from "./agent"
import { Agent } from "./agent"
import type { MetalMcpClient } from "./mcpClient"

export type StoredConversation = {
	id: string
	title: string
	messages: ChatCompletionMessage[]
	createdAt: number
	updatedAt: number
}

type AgentEntry = {
	agent: Agent
	updatedAt: number
}

export class ConversationStore {
	#db: PersistentMap<StoredConversation>
	#agents = new Map<string, AgentEntry>()
	#mcpClient: MetalMcpClient
	#tools: ChatCompletionTool[]
	#model: string
	#llmBaseUrl: string

	constructor(options: {
		dbPath: string
		mcpClient: MetalMcpClient
		tools: ChatCompletionTool[]
		model: string
		llmBaseUrl: string
	}) {
		this.#db = new PersistentMap<StoredConversation>(options.dbPath)
		this.#mcpClient = options.mcpClient
		this.#tools = options.tools
		this.#model = options.model
		this.#llmBaseUrl = options.llmBaseUrl
	}

	getOrCreate(id: string): { conversationId: string; agent: Agent | null } {
		const existing = this.#agents.get(id)
		if (existing) {
			return { conversationId: id, agent: existing.agent }
		}

		const stored = this.#db.get(id) as StoredConversation | undefined
		if (stored) {
			const agent = this.#createAgent(stored.messages)
			this.#agents.set(id, { agent, updatedAt: stored.updatedAt })
			return { conversationId: id, agent }
		}

		return { conversationId: id, agent: null }
	}

	create(title: string, firstMessage: ChatCompletionMessage): { conversationId: string; agent: Agent } {
		const id = crypto.randomUUID()
		const now = Date.now()

		const stored: StoredConversation = {
			id,
			title,
			messages: [firstMessage],
			createdAt: now,
			updatedAt: now,
		}
		this.#db.set(id, stored)

		const agent = this.#createAgent([firstMessage])
		this.#agents.set(id, { agent, updatedAt: now })

		return { conversationId: id, agent }
	}

	saveMessages(id: string, messages: ChatCompletionMessage[]) {
		const stored = this.#db.get(id) as StoredConversation | undefined
		if (!stored) return

		stored.messages = messages
		stored.updatedAt = Date.now()
		this.#db.set(id, stored)

		const entry = this.#agents.get(id)
		if (entry) {
			entry.updatedAt = stored.updatedAt
		}
	}

	list(): StoredConversation[] {
		return this.#db.entries()
			.map(([_, v]: [string, unknown]) => v as StoredConversation)
			.sort((a: StoredConversation, b: StoredConversation) => b.updatedAt - a.updatedAt)
	}

	get(id: string): StoredConversation | undefined {
		return this.#db.get(id) as StoredConversation | undefined
	}

	delete(id: string) {
		this.#db.delete(id)
		this.#agents.delete(id)
	}

	#createAgent(messages: ChatCompletionMessage[]): Agent {
		const agent = new Agent({
			mcpClient: this.#mcpClient,
			tools: this.#tools,
			model: this.#model,
			llmBaseUrl: this.#llmBaseUrl,
		})
		agent.loadMessages(messages)
		return agent
	}
}
