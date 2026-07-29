//
//
//
import { AsyncLocalStorage } from "node:async_hooks"
import { Logger } from "@metal/logger"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import type { Request, Response } from "express"
import z from "zod"
//
import { RowUtils } from "../../utils/RowUtils"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { HTTP_STATUS_CODE, SERVER } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { Schema } from "../schema/Schema"
import type {
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../schema/types/TSchemaResponse"
import { MCP_DEFAULT_ROW_LIMIT } from "./@consts"
import type { U__mcp, U__mcp_tool, U__mcp_tool_parameter } from "./types/U__mcp"

//
export const asyncLocalStorage = new AsyncLocalStorage<TUserTokenInfo>()

const ACTION_TO_PERMISSION: Record<string, string> = {
	read: AUTH_PERMISSION.READ,
	create: AUTH_PERMISSION.CREATE,
	update: AUTH_PERMISSION.UPDATE,
	delete: AUTH_PERMISSION.DELETE,
	list: AUTH_PERMISSION.LIST,
}

const ZOD_TYPE_MAP: Record<string, z.ZodType> = {
	string: z.string(),
	number: z.number(),
	boolean: z.boolean(),
	array: z.array(z.unknown()),
}

//
function _logToolCall(
	toolName: string,
	args: unknown,
	user: TUserTokenInfo | undefined,
	startMs: number,
	error?: unknown,
) {
	const duration = Date.now() - startMs
	const caller = user?.user ?? "unknown"
	const status = error ? "error" : "success"
	const argsStr = JSON.stringify(args)
	const errorStr = error instanceof Error ? ` error="${error.message}"` : ""
	Logger.Info(
		`[MCP] tool=${toolName} caller=${caller} args=${argsStr} status=${status} duration=${duration}ms${errorStr}`,
	)
}

function _getHideSensitiveFields(): string[] | undefined {
	if (!ConfigManager.Has("mcp")) return undefined
	const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
	return mcpConfig?.["hide-sensitive-data"]
}

function _hasToolAccess(toolConfig: U__mcp_tool, user: TUserTokenInfo | undefined): boolean {
	if (toolConfig.roles) {
		const userRoles = user?.roles ?? []
		return toolConfig.roles.some((r) => userRoles.includes(r))
	}

	const permission = ACTION_TO_PERMISSION[toolConfig.action] ?? AUTH_PERMISSION.READ
	return Roles.HasPermission(user, undefined, permission)
}

function _buildFilterFromParams(
	args: Record<string, unknown>,
	paramConfigs: Record<string, U__mcp_tool_parameter>,
): Record<string, unknown> {
	const filter: Record<string, unknown> = {}
	for (const [paramName, config] of Object.entries(paramConfigs)) {
		const value = args[paramName] ?? config.default
		if (value !== undefined) {
			filter[config["map-to"]] = value
		}
	}
	return filter
}

function _buildDataFromParams(
	args: Record<string, unknown>,
	paramConfigs: Record<string, U__mcp_tool_parameter>,
): Record<string, unknown> {
	const data: Record<string, unknown> = {}
	for (const [paramName, config] of Object.entries(paramConfigs)) {
		const value = args[paramName] ?? config.default
		if (value !== undefined) {
			data[config["map-to"]] = value
		}
	}
	return data
}

function _buildInputSchema(
	parameters: Record<string, U__mcp_tool_parameter> | undefined,
): Record<string, z.ZodType> | undefined {
	if (!parameters || Object.keys(parameters).length === 0) return undefined

	const shape: Record<string, z.ZodType> = {}

	for (const [name, param] of Object.entries(parameters)) {
		let fieldSchema = ZOD_TYPE_MAP[param.type] ?? z.string()

		if (param.description) fieldSchema = fieldSchema.describe(param.description)
		if (param.enum) fieldSchema = z.enum(param.enum as [string, ...string[]])
		if (param.default !== undefined) fieldSchema = fieldSchema.default(param.default)
		if (!param.required) fieldSchema = fieldSchema.optional()

		shape[name] = fieldSchema
	}

	return shape
}

function _mcpResult(content: string, isError?: boolean) {
	return { content: [{ type: "text" as const, text: content }], ...(isError ? { isError: true as const } : {}) }
}

//
export class McpAdapter {
	static async HandleRequest(req: Request, res: Response): Promise<void> {
		const userToken = req.__METAL_CURRENT_USER

		Logger.Info(`[MCP] Request received caller=${userToken?.user ?? "unknown"}`)

		try {
			const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
			const server = new McpServer(
				{
					name: SERVER.NAME,
					version: SERVER.VERSION,
				},
				{
					capabilities: {},
				},
			)

			McpAdapter.#registerConfigTools(server, mcpConfig?.tools ?? {}, userToken)

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
			Logger.Error("[MCP] Error handling MCP request:", error)
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

	static #registerConfigTools(server: McpServer, tools: U__mcp["tools"], user: TUserTokenInfo | undefined): void {
		for (const [toolName, toolConfig] of Object.entries(tools)) {
			if (!_hasToolAccess(toolConfig, user)) continue

			const inputSchema = _buildInputSchema(toolConfig?.arguments)

			server.registerTool(
				toolName,
				{
					description: toolConfig.description,
					...(inputSchema ? { inputSchema } : {}),
				},
				async (args) => {
					const startMs = Date.now()
					const currentUser = asyncLocalStorage.getStore()
					try {
						return await McpAdapter.#executeSchemaTool(toolName, toolConfig, args as Record<string, unknown>, currentUser)
					} catch (error) {
						_logToolCall(toolName, args, currentUser, startMs, error)
						return _mcpResult(`Error: ${error instanceof Error ? error.message : String(error)}`, true)
					}
				},
			)
		}
	}

	static async #executeSchemaTool(
		toolName: string,
		toolConfig: U__mcp_tool,
		args: Record<string, unknown>,
		user: TUserTokenInfo | undefined,
	) {
		const startMs = Date.now()
		const params = toolConfig.arguments ?? {}
		const rowLimit = toolConfig.limit ?? MCP_DEFAULT_ROW_LIMIT
		const fields = toolConfig.fields?.join(",")

		let result: TInternalResponse<TSchemaResponse | undefined>

		switch (toolConfig.action) {
			case "read": {
				const schemaRequest: TSchemaRequestSelect = {
					schema: toolConfig.schema,
					entity: toolConfig.entity,
				}
				const filter = _buildFilterFromParams(args, params)
				if (Object.keys(filter).length > 0) schemaRequest.filter = filter
				if (fields) schemaRequest.fields = fields
				if (toolConfig.cache) schemaRequest.cache = toolConfig.cache
				result = await Schema.Select(schemaRequest, user)
				break
			}
			case "create": {
				const schemaRequest: TSchemaRequestInsert = {
					schema: toolConfig.schema,
					entity: toolConfig.entity,
					data: _buildDataFromParams(args, params),
				}
				result = await Schema.Insert(schemaRequest, user)
				break
			}
			case "update": {
				const schemaRequest: TSchemaRequestUpdate = {
					schema: toolConfig.schema,
					entity: toolConfig.entity,
					filter: _buildFilterFromParams(args, params),
					data: _buildDataFromParams(args, params),
				}
				result = await Schema.Update(schemaRequest, user)
				break
			}
			case "delete": {
				const schemaRequest: TSchemaRequestDelete = {
					schema: toolConfig.schema,
					entity: toolConfig.entity,
					filter: _buildFilterFromParams(args, params),
				}
				result = await Schema.Delete(schemaRequest, user)
				break
			}
			case "list": {
				const schemaRequest: TSchemaRequestListEntities = {
					schema: toolConfig.schema,
				}
				result = await Schema.ListEntities(schemaRequest, user)
				break
			}
			default: {
				return _mcpResult(`Unsupported action: ${String((toolConfig as any)?.action)}`)
			}
		}

		if (!result?.Body) {
			_logToolCall(toolName, args, user, startMs)
			return _mcpResult("No data returned")
		}

		const hideFields = _getHideSensitiveFields()

		const showRows = toolConfig.action === "read" || toolConfig.action === "list"

		if (showRows) {
			const rawRows = await result.Body.data.Rows({ limit: rowLimit })
			const rows = rawRows.map((row) => RowUtils.Omit(row, hideFields))
			const output = {
				fields: result.Body.data.Fields,
				rows,
				count: rows.length,
			}
			_logToolCall(toolName, args, user, startMs)
			return _mcpResult(JSON.stringify(output, null, 2))
		}

		_logToolCall(toolName, args, user, startMs)
		return _mcpResult(JSON.stringify({ success: true }, null, 2))
	}
}
