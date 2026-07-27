//
//
//
import z from "zod"

//
export const z_U__mcp_tool_parameter_type = z.enum(["string", "number", "boolean", "array"])

export const z_U__mcp_tool_parameter = z.strictObject({
	type: z_U__mcp_tool_parameter_type,
	required: z.boolean().default(false).optional(),
	description: z.string().min(1),
	default: z.unknown().optional(),
	enum: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
	"maps-to": z.string().optional(),
})

export const z_U__mcp_tool_action = z.enum(["read", "create", "update", "delete"])

export const z_U__mcp_tool = z.strictObject({
	description: z.string().min(1),
	schema: z.string(),
	entity: z.string(),
	action: z_U__mcp_tool_action.default("read"),
	destructive: z.boolean().default(false),
	role: z.string().optional(),
	cache: z.number().int().min(1).optional(),
	parameters: z.record(z.string(), z_U__mcp_tool_parameter).default({}).optional(),
})

export const z_U__mcp_server = z
	.strictObject({
		name: z.string().default("metal-mcp"),
		version: z.string().default("1.0.0"),
	})
	.optional()

export const z_U__mcp = z.strictObject({
	server: z_U__mcp_server,
	tools: z.record(z.string(), z_U__mcp_tool).default({}),
	"hide-sensitive-data": z.array(z.string()).optional(),
})

//
export type U__mcp_tool_parameter_type = z.infer<typeof z_U__mcp_tool_parameter_type>
export type U__mcp_tool_parameter = z.infer<typeof z_U__mcp_tool_parameter>
export type U__mcp_tool_action = z.infer<typeof z_U__mcp_tool_action>
export type U__mcp_tool = z.infer<typeof z_U__mcp_tool>
export type U__mcp_server = z.infer<typeof z_U__mcp_server>
export type U__mcp = z.infer<typeof z_U__mcp>
