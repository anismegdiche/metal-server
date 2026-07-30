//
//
//
import z from "zod"

export enum MCP_ARGUMENT_TYPE {
	STRING = "string",
	NUMBER = "number",
	BOOLEAN = "boolean",
	ARRAY = "array",
	JSON = "json",
	STRUCTURE = "structure"
}


//
export enum MCP_ACTION {
	CREATE = "create",
	READ = "read",
	UPDATE = "update",
	DELETE = "delete",
	LIST = "list"
}


//
export const z_U__mcp_tool_parameter_type = z.enum([MCP_ARGUMENT_TYPE.STRING, MCP_ARGUMENT_TYPE.NUMBER, MCP_ARGUMENT_TYPE.BOOLEAN, MCP_ARGUMENT_TYPE.ARRAY, MCP_ARGUMENT_TYPE.JSON, MCP_ARGUMENT_TYPE.STRUCTURE])

export const z_U__mcp_tool_parameter_scalar = z.strictObject({
	type: z.enum([MCP_ARGUMENT_TYPE.STRING, MCP_ARGUMENT_TYPE.NUMBER, MCP_ARGUMENT_TYPE.BOOLEAN]),
	required: z.boolean().default(false).optional(),
	description: z.string().min(1).optional(),
	default: z.unknown().optional(),
	enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
	"map-to": z.string().optional(),
})

export const z_U__mcp_tool_parameter_json = z.strictObject({
	type: z.literal(MCP_ARGUMENT_TYPE.JSON),
	required: z.boolean().default(false).optional(),
	description: z.string().min(1).optional(),
	default: z.unknown().optional(),
	"map-to": z.string().optional(),
})

// structure is defined before array so array can reference it without forward refs
export const z_U__mcp_tool_parameter_structure = z.strictObject({
	type: z.literal(MCP_ARGUMENT_TYPE.STRUCTURE),
	required: z.boolean().default(false).optional(),
	description: z.string().min(1).optional(),
	default: z.unknown().optional(),
	// one level only — scalar and json children, no nested structures
	properties: z.record(z.string(), z.union([z_U__mcp_tool_parameter_scalar, z_U__mcp_tool_parameter_json])).optional(),
})

export const z_U__mcp_tool_parameter_array = z.strictObject({
	type: z.literal(MCP_ARGUMENT_TYPE.ARRAY),
	required: z.boolean().default(false).optional(),
	description: z.string().min(1).optional(),
	default: z.unknown().optional(),
	enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
	"map-to": z.string().optional(),
	items: z.union([z_U__mcp_tool_parameter_scalar, z_U__mcp_tool_parameter_json, z_U__mcp_tool_parameter_structure]).optional(),
})

export const z_U__mcp_tool_parameter = z.union([
	z_U__mcp_tool_parameter_scalar,
	z_U__mcp_tool_parameter_array,
	z_U__mcp_tool_parameter_json,
	z_U__mcp_tool_parameter_structure,
])

export const z_U__mcp_tool_crud = z.strictObject({
	entity: z.string(),
	action: z.enum([MCP_ACTION.CREATE, MCP_ACTION.READ, MCP_ACTION.UPDATE, MCP_ACTION.DELETE]).default(MCP_ACTION.READ),
	fields: z.array(z.string())
		.optional(),
	arguments: z.record(z.string(), z_U__mcp_tool_parameter).default({})
		.optional(),
})

export const z_U__mcp_tool_list = z.strictObject({
	action: z.literal(MCP_ACTION.LIST).default(MCP_ACTION.LIST),
	fields: z.array(z.string())
		.optional(),
	arguments: z.record(z.string(), z_U__mcp_tool_parameter).default({})
		.optional(),
})

export const z_U__mcp_tool = z.object({
	description: z.string().min(1),
	schema: z.string(),
	roles: z.array(z.string())
		.optional(),
	cache: z.number().int().min(1)
		.optional(),
	limit: z.number().int().min(1).default(10)
		.optional()
}).and(z.discriminatedUnion("action", [
	z_U__mcp_tool_crud,
	z_U__mcp_tool_list
]))

export const z_U__mcp = z.strictObject({
	tools: z.record(z.string(), z_U__mcp_tool).default({}),
	"hide-sensitive-data": z.array(z.string())
		.optional(),
})

//
export type U__mcp_tool_parameter_type = z.infer<typeof z_U__mcp_tool_parameter_type>
export type U__mcp_tool_parameter = z.infer<typeof z_U__mcp_tool_parameter>
export type U__mcp_tool = z.infer<typeof z_U__mcp_tool>
export type U__mcp = z.infer<typeof z_U__mcp>
