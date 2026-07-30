import { describe, expect, it } from "vitest"
import z from "zod"
import { _buildDataFromParams, _buildInputSchema } from "../McpAdapter"
import type { U__mcp_tool_parameter } from "../types/U__mcp"
import { MCP_ARGUMENT_TYPE } from "../types/U__mcp"

describe("McpAdapter schema builder - nested objects and arrays", () => {
	it("builds nested object schema and validates payloads", () => {
		const params: Record<string, U__mcp_tool_parameter> = {
			contact: {
				type: MCP_ARGUMENT_TYPE.STRUCTURE,
				required: true,
				properties: {
					firstName: { type: MCP_ARGUMENT_TYPE.STRING, required: true, "map-to": "firstName" },
					lastName: { type: MCP_ARGUMENT_TYPE.STRING, required: true, "map-to": "lastName" },
				},
			},
			tags: {
				type: MCP_ARGUMENT_TYPE.ARRAY,
				items: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "tags" },
				required: false,
			},
		}

		const shape = _buildInputSchema(params)
		expect(shape).toBeDefined()
		const schema = z.object(shape as Record<string, z.ZodTypeAny>)

		const ok = schema.safeParse({ contact: { firstName: "Alice", lastName: "Smith" }, tags: ["x"] })
		expect(ok.success).toBe(true)

		const missing = schema.safeParse({ contact: { lastName: "Smith" } })
		expect(missing.success).toBe(false)
	})

	it("builds array-of-object items schema", () => {
		const params: Record<string, U__mcp_tool_parameter> = {
			items: {
				type: MCP_ARGUMENT_TYPE.ARRAY,
				items: {
					type: MCP_ARGUMENT_TYPE.STRUCTURE,
					properties: {
						id: { type: MCP_ARGUMENT_TYPE.NUMBER, "map-to": "id" },
						label: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "label" },
					},
				},
			},
		}

		const shape = _buildInputSchema(params)
		const schema = z.object(shape as Record<string, z.ZodTypeAny>)

		const ok = schema.safeParse({
			items: [
				{ id: 1, label: "x" },
				{ id: 2, label: "y" },
			],
		})
		expect(ok.success).toBe(true)

		const bad = schema.safeParse({ items: [{ id: "nope" }] })
		expect(bad.success).toBe(false)
	})
})

describe("McpAdapter data builder - flatten nested objects", () => {
	it("flattens nested object fields using nested map-to keys", () => {
		const params: Record<string, U__mcp_tool_parameter> = {
			contact: {
				type: MCP_ARGUMENT_TYPE.STRUCTURE,
				properties: {
					firstName: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "firstName" },
					lastName: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "lastName" },
				},
			},
			company: {
				type: MCP_ARGUMENT_TYPE.STRUCTURE,
				properties: {
					name: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "company_name" },
					industry: { type: MCP_ARGUMENT_TYPE.STRING, "map-to": "industry" },
				},
			},
		}

		const args = {
			contact: { firstName: "A", lastName: "B" },
			company: { name: "C", industry: "IT" },
		}

		const data = _buildDataFromParams(args, params)
		expect(data.firstName).toBe("A")
		expect(data.lastName).toBe("B")
		expect(data.company_name).toBe("C")
		expect(data.industry).toBe("IT")
	})
})
