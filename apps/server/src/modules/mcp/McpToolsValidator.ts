//
//
//
import { Logger } from "@metal/logger"
import { ConfigManager } from "../core/ConfigManager"
import { ConfigFileError } from "../errors/HttpErrorBase"
import { Schema } from "../schema/Schema"
import { MCP_TOOL_NAME_REGEX } from "./@consts"
import type { U__mcp } from "./types/U__mcp"


//
export class McpToolsValidator {
	@Logger.LogFunction(true)
	static Validate(): void {
		if (!ConfigManager.Has("mcp")) return

		const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
		const tools = mcpConfig?.tools
		if (!tools || Object.keys(tools).length === 0) return

		McpToolsValidator._validateToolNames(tools)
		McpToolsValidator._validateToolParams(tools)
		McpToolsValidator._validateToolReferences(tools)
	}

	@Logger.LogFunction(true)
	static _validateToolNames(tools: U__mcp["tools"]): void {
		for (const toolName of Object.keys(tools)) {
			if (!MCP_TOOL_NAME_REGEX.test(toolName)) {
				throw new ConfigFileError(
					`MCP tool name '${toolName}' does not match required pattern ${MCP_TOOL_NAME_REGEX}`,
				)
			}
		}
	}

	@Logger.LogFunction(true)
	static _validateToolParams(tools: U__mcp["tools"]): void {
		for (const [toolName, tool] of Object.entries(tools)) {
			const params = tool.arguments
			if (!params) continue

			for (const [paramName, param] of Object.entries(params)) {
				McpToolsValidator._validateToolParam(toolName, paramName, param)
			}
		}
	}

	@Logger.LogFunction(true)
	static _validateToolParam(toolName: string, paramName: string, param: NonNullable<NonNullable<U__mcp["tools"][string]>["arguments"]>[string]): void {
		if (!param.description) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' parameter '${paramName}' is missing 'description'`,
			)
		}
		if (!param.type) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' parameter '${paramName}' is missing 'type'`,
			)
		}

		if (param.type === "json" || param.type === "structure") {
			McpToolsValidator._validateObjectParam(toolName, paramName, param)
		}
	}

	@Logger.LogFunction(true)
	static _validateObjectParam(toolName: string, paramName: string, param: NonNullable<NonNullable<U__mcp["tools"][string]>["arguments"]>[string]): void {
		if (param.type === "json") {
			if (!param["map-to"]) {
				throw new ConfigFileError(
					`MCP tool '${toolName}' parameter '${paramName}' is invalid: json arguments must define 'map-to'`,
				)
			}
			return
		}

		if (param.type !== "structure") return

		if (!param.properties || Object.keys(param.properties).length === 0) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' parameter '${paramName}' is invalid: structure arguments must define at least one property`,
			)
		}
	}

	@Logger.LogFunction(true)
	static _validateToolReferences(tools: U__mcp["tools"]): void {
		const schemas = Schema._schemaParams

		for (const [toolName, tool] of Object.entries(tools)) {
			if (tool.action === "list") {
				McpToolsValidator._validateSchemaRefSkipEntity(toolName, tool.schema, schemas)
			} else {
				McpToolsValidator._validateSchemaRef(toolName, tool.schema, tool.entity, schemas)
			}
		}
	}

	@Logger.LogFunction(true)
	static _validateSchemaRefSkipEntity(toolName: string, schemaName: string, schemas: Record<string, unknown> | undefined): void {
		if (!schemas?.[schemaName]) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' references schema '${schemaName}' which does not exist`,
			)
		}
	}

	@Logger.LogFunction(true)
	static _validateSchemaRef(toolName: string, schemaName: string, entityName: string, schemas: Record<string, unknown> | undefined): void {
		if (!schemas?.[schemaName]) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' references schema '${schemaName}' which does not exist`,
			)
		}

		const schemaConfig = Schema._schemaParams[schemaName]
		if (!schemaConfig) return

		const hasWildcard = !!schemaConfig.source
		const hasEntity = !!schemaConfig.entities?.[entityName]

		if (!hasWildcard && !hasEntity) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' references entity '${entityName}' which does not exist in schema '${schemaName}'`,
			)
		}
	}

}
