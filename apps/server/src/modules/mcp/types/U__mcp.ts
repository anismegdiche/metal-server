//
//
//
import z from "zod"

enum MCP_ACTION {
	CREATE = "create",
	READ = "read",
	UPDATE = "update",
	DELETE = "delete",
	LIST = "list"
}


//
export const z_U__mcp_tool_parameter_type = z.enum(["string", "number", "boolean", "array"])

export const z_U__mcp_tool_parameter = z.strictObject({
	type: z_U__mcp_tool_parameter_type,
	required: z.boolean().default(false)
		.optional(),
	description: z.string().min(1),
	default: z.unknown()
		.optional(),
	enum: z.array(z.union([z.string(), z.number(), z.boolean()]))
		.optional(),
	"map-to": z.string(),
})

// export const z_U__mcp_tool_action = z.enum(["read", "create", "update", "delete", "list"])

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
// export type U__mcp_tool_action = z.infer<typeof z_U__mcp_tool_action>
export type U__mcp_tool = z.infer<typeof z_U__mcp_tool>
export type U__mcp = z.infer<typeof z_U__mcp>
