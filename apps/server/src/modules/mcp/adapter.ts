//
//
//
import { AsyncLocalStorage } from "node:async_hooks"
//
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { Request, Response } from "express"
import z from "zod"
//
import type { TRow } from "../../types/DataTable"
import type { TUserTokenInfo } from "../auth/@types"
import { HTTP_STATUS_CODE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import type { U__schemas_schema } from "../core/types/U__schemas"
import type { U__sources_source } from "../core/types/U__sources"
import { PlansManager } from "../plan/PlansManager"
import { Schema } from "../schema/Schema"
import type { TSchemaRequestSelect } from "../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../schema/types/TSchemaResponse"
import { SourceRegistry } from "../source/SourceRegistry"
import { MCP_DEFAULT_ROW_LIMIT, MCP_TOOL } from "./@consts"
import type { U__mcp } from "./types/U__mcp"

//
export const asyncLocalStorage = new AsyncLocalStorage<TUserTokenInfo>()

function _logToolCall(toolName: string, args: unknown, user: TUserTokenInfo | undefined, startMs: number, error?: unknown) {
	const duration = Date.now() - startMs
	const caller = user?.user ?? "unknown"
	const status = error ? "error" : "success"
	const argsStr = JSON.stringify(args)
	const errorStr = error instanceof Error ? ` error="${error.message}"` : ""
	console.log(`[MCP] tool=${toolName} caller=${caller} args=${argsStr} status=${status} duration=${duration}ms${errorStr}`)
}

function _stripSensitiveFields(row: TRow, hideFields: string[] | undefined): TRow {
	const result: TRow = {}
	for (const [key, value] of Object.entries(row)) {
		if (key.startsWith("__")) continue
		if (hideFields?.includes(key)) continue
		result[key] = value
	}
	return result
}

function _getHideSensitiveFields(): string[] | undefined {
	if (!ConfigManager.Has("mcp")) return undefined
	const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
	return mcpConfig?.["hide-sensitive-data"]
}

function _findSchemaForEntity(entityName: string): { schemaName: string; schemaConfig: U__schemas_schema } | undefined {
	if (!Schema._schemaParams) return undefined

	for (const [schemaName, schemaConfig] of Object.entries(Schema._schemaParams)) {
		if (schemaConfig.entities && entityName in schemaConfig.entities) {
			return { schemaName, schemaConfig }
		}
	}
	return undefined
}

//
export class MetalMcpAdapter {
	static async HandleRequest(req: Request, res: Response): Promise<void> {
		const userToken = req.__METAL_CURRENT_USER

		const startMs = Date.now()
		console.log(`[MCP] Request received caller=${userToken?.user ?? "unknown"}`)

		try {
			const server = new McpServer(
				{ name: "metal-mcp", version: "1.0.0" },
				{ capabilities: {} },
			)

			MetalMcpAdapter.#registerTools(server)

			const transport = new StreamableHTTPServerTransport({
				sessionIdGenerator: undefined,
			})

			await server.connect(transport)

			await asyncLocalStorage.run(userToken, async () => {
				await transport.handleRequest(req, res, req.body)
			})

			res.on("close", () => {
				transport.close()
				server.close()
			})
		} catch (error) {
			console.error("[MCP] Error handling MCP request:", error)
			if (!res.headersSent) {
				res.status(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR).json({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: error instanceof Error ? error.message : "Internal server error",
					},
					id: null,
				})
			}
		}
	}

	static #registerTools(server: McpServer): void {
		server.registerTool(
			MCP_TOOL.LIST_SOURCES,
			{
				description: "List all configured data sources",
			},
			async () => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					const sources: Array<{ name: string; provider: string; host?: string; port?: number; database?: string }> = []

					for (const [name, source] of SourceRegistry.Sources) {
						const config = source.SourceConfig as U__sources_source
						sources.push({
							name,
							provider: config.provider,
							host: config.host,
							port: config.port ?? undefined,
							database: config.database,
						})
					}

					_logToolCall(MCP_TOOL.LIST_SOURCES, {}, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(sources, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.LIST_SOURCES, {}, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error listing sources: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.GET_SOURCE,
			{
				description: "Get details of a specific data source",
				inputSchema: {
					sourceId: z.string().describe("The source name/id to retrieve"),
				},
			},
			async (args) => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					const source = SourceRegistry.Sources.get(args.sourceId)
					if (!source) {
						_logToolCall(MCP_TOOL.GET_SOURCE, args, user, startMs)
						return {
							content: [{ type: "text", text: `Source '${args.sourceId}' not found` }],
							isError: true,
						}
					}

					const config = { ...source.SourceConfig } as Record<string, unknown>
					delete config.password

					const result = {
						name: args.sourceId,
						...config,
					}

					_logToolCall(MCP_TOOL.GET_SOURCE, args, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.GET_SOURCE, args, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error getting source: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.LIST_SCHEMAS,
			{
				description: "List all configured schemas with their entities",
			},
			async () => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					const schemas: Array<{
						name: string
						source?: string
						entities?: Record<string, { source: string; entity: string }>
					}> = []

					if (Schema._schemaParams) {
						for (const [name, config] of Object.entries(Schema._schemaParams)) {
							schemas.push({
								name,
								source: config.source,
								entities: config.entities,
							})
						}
					}

					_logToolCall(MCP_TOOL.LIST_SCHEMAS, {}, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(schemas, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.LIST_SCHEMAS, {}, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error listing schemas: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.GET_SCHEMA,
			{
				description: "Get details of a specific schema including its entities and source mappings",
				inputSchema: {
					schemaId: z.string().describe("The schema name to retrieve"),
				},
			},
			async (args) => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					if (!Schema._schemaParams || !(args.schemaId in Schema._schemaParams)) {
						_logToolCall(MCP_TOOL.GET_SCHEMA, args, user, startMs)
						return {
							content: [{ type: "text", text: `Schema '${args.schemaId}' not found` }],
							isError: true,
						}
					}

					const config = Schema._schemaParams[args.schemaId]
					const result = {
						name: args.schemaId,
						source: config?.source,
						entities: config?.entities,
						roles: config?.roles,
						anonymize: config?.anonymize,
					}

					_logToolCall(MCP_TOOL.GET_SCHEMA, args, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.GET_SCHEMA, args, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error getting schema: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.PREVIEW_ENTITY,
			{
				description: "Preview a small sample of rows from an entity. If only entity is provided, it is searched across all schemas.",
				inputSchema: {
					entity: z.string().describe("The entity name to preview"),
					schema: z.string().optional().describe("The schema name (optional — if omitted, the entity is searched across all schemas)"),
					limit: z.number().int().min(1).max(MCP_DEFAULT_ROW_LIMIT).default(5).describe(`Maximum number of rows to return (max ${MCP_DEFAULT_ROW_LIMIT})`),
				},
			},
			async (args) => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					let schemaName = args.schema

					if (!schemaName) {
						const found = _findSchemaForEntity(args.entity)
						if (!found) {
							_logToolCall(MCP_TOOL.PREVIEW_ENTITY, args, user, startMs)
							return {
								content: [{ type: "text", text: `Entity '${args.entity}' not found in any schema` }],
								isError: true,
							}
						}
						schemaName = found.schemaName
					}

					const limit = Math.min(args.limit, MCP_DEFAULT_ROW_LIMIT)

					const schemaRequest: TSchemaRequestSelect = {
						schema: schemaName,
						entity: args.entity,
					}

					const intRes: TInternalResponse<TSchemaResponse | undefined> = await Schema.Select(schemaRequest, user)

					if (!intRes.Body) {
						_logToolCall(MCP_TOOL.PREVIEW_ENTITY, args, user, startMs)
						return {
							content: [{ type: "text", text: "No data returned" }],
						}
					}

					const hideFields = _getHideSensitiveFields()
					const rawRows = await intRes.Body.data.Rows({ limit })
					const rows = rawRows.map((row) => _stripSensitiveFields(row, hideFields))
					const fields = intRes.Body.data.Fields

					const result = {
						schema: schemaName,
						entity: args.entity,
						fields,
						rows,
						count: rows.length,
					}

					_logToolCall(MCP_TOOL.PREVIEW_ENTITY, args, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.PREVIEW_ENTITY, args, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error previewing entity: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.LIST_PLANS,
			{
				description: "List all configured plans",
			},
			async () => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					const plans: Array<{ name: string; steps: number }> = []

					for (const [name, config] of Object.entries(PlansManager.Config)) {
						plans.push({
							name,
							steps: config.steps?.length ?? 0,
						})
					}

					_logToolCall(MCP_TOOL.LIST_PLANS, {}, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(plans, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.LIST_PLANS, {}, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error listing plans: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)

		server.registerTool(
			MCP_TOOL.GET_PLAN,
			{
				description: "Get the definition of a specific plan including its steps",
				inputSchema: {
					planId: z.string().describe("The plan name to retrieve"),
				},
			},
			async (args) => {
				const startMs = Date.now()
				const user = asyncLocalStorage.getStore()
				try {
					const planConfig = PlansManager.Config[args.planId]
					if (!planConfig) {
						_logToolCall(MCP_TOOL.GET_PLAN, args, user, startMs)
						return {
							content: [{ type: "text", text: `Plan '${args.planId}' not found` }],
							isError: true,
						}
					}

					const result = {
						name: args.planId,
						steps: planConfig.steps,
						"on-error": planConfig["on-error"],
						"failure-strategy": planConfig["failure-strategy"],
					}

					_logToolCall(MCP_TOOL.GET_PLAN, args, user, startMs)
					return {
						content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
					}
				} catch (error) {
					_logToolCall(MCP_TOOL.GET_PLAN, args, user, startMs, error)
					return {
						content: [{ type: "text", text: `Error getting plan: ${error instanceof Error ? error.message : String(error)}` }],
						isError: true,
					}
				}
			},
		)
	}
}
