//
//
//
import { ConfigManager } from "../core/ConfigManager"
import { ConfigFileError } from "../errors/HttpErrorBase"
import { Schema } from "../schema/Schema"
import { MCP_TOOL_NAME_REGEX } from "./@consts"
import type { U__mcp } from "./types/U__mcp"


//
export class McpToolsValidator {
	static Validate(): void {
		if (!ConfigManager.Has("mcp")) return

		const mcpConfig = ConfigManager.Get<U__mcp>("mcp")
		const tools = mcpConfig?.tools
		if (!tools || Object.keys(tools).length === 0) return

		McpToolsValidator.#validateToolNames(tools)
		McpToolsValidator.#validateToolParams(tools)
		McpToolsValidator.#validateToolReferences(tools)
	}

	static #validateToolNames(tools: U__mcp["tools"]): void {
		for (const toolName of Object.keys(tools)) {
			if (!MCP_TOOL_NAME_REGEX.test(toolName)) {
				throw new ConfigFileError(
					`MCP tool name '${toolName}' does not match required pattern ${MCP_TOOL_NAME_REGEX}`,
				)
			}
		}
	}

	static #validateToolParams(tools: U__mcp["tools"]): void {
		for (const [toolName, tool] of Object.entries(tools)) {
			const params = tool.arguments
			if (!params) continue

			for (const [paramName, param] of Object.entries(params)) {
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
			}
		}
	}

	static #validateToolReferences(tools: U__mcp["tools"]): void {
		const schemas = Schema._schemaParams

		for (const [toolName, tool] of Object.entries(tools)) {
			if (tool.action === "list") {
				McpToolsValidator.#validateSchemaRefSkipEntity(toolName, tool.schema, schemas)
			} else {
				McpToolsValidator.#validateSchemaRef(toolName, tool.schema, tool.entity, schemas)
			}
		}
	}

	static #validateSchemaRefSkipEntity(toolName: string, schemaName: string, schemas: Record<string, unknown> | undefined): void {
		if (!schemas?.[schemaName]) {
			throw new ConfigFileError(
				`MCP tool '${toolName}' references schema '${schemaName}' which does not exist`,
			)
		}
	}

	static #validateSchemaRef(toolName: string, schemaName: string, entityName: string, schemas: Record<string, unknown> | undefined): void {
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
