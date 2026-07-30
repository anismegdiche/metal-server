import { describe, expect, it } from "vitest"
import { ConfigFileError } from "../../errors/HttpErrorBase"
import { McpToolsValidator } from "../McpToolsValidator"
import { MCP_ACTION, MCP_ARGUMENT_TYPE } from "../types/U__mcp"

describe("McpToolsValidator", () => {
it("accepts json arguments that map to a single field", () => {
		expect(() =>
			McpToolsValidator._validateToolParams({
				create_contact: {
					description: "Create a contact",
					schema: "crm",
					entity: "contact",
					action: MCP_ACTION.CREATE,
					arguments: {
						contact: {
							type: MCP_ARGUMENT_TYPE.JSON,
							description: "Contact payload",
							"map-to": "contact",
						},
					},
				},
			}),
		).not.toThrow()
	})

	it("accepts structure arguments that act as a remapping container", () => {
		expect(() =>
			McpToolsValidator._validateToolParams({
				create_contact: {
					description: "Create a contact",
					schema: "crm",
					entity: "contact",
					action: MCP_ACTION.CREATE,
					arguments: {
						contact: {
							type: MCP_ARGUMENT_TYPE.STRUCTURE,
							description: "Contact details",
							properties: {
								first_name: {
									type: MCP_ARGUMENT_TYPE.STRING,
									description: "First name",
									"map-to": "first_name",
								},
								company_name: {
									type: MCP_ARGUMENT_TYPE.STRING,
									description: "Company",
									"map-to": "company",
								},
							},
						},
					},
				},
			}),
		).not.toThrow()
	})

	it("rejects json arguments that omit map-to", () => {
		expect(() =>
			McpToolsValidator._validateToolParams({
				create_contact: {
					description: "Create a contact",
					schema: "crm",
					entity: "contact",
					action: MCP_ACTION.CREATE,
					arguments: {
						contact: {
							type: MCP_ARGUMENT_TYPE.JSON,
							description: "JSON payload without map-to",
						},
					},
				},
			}),
		).toThrow(ConfigFileError)
	})

	it("rejects structure arguments that define no properties", () => {
		expect(() =>
			McpToolsValidator._validateToolParams({
				create_contact: {
					description: "Create a contact",
					schema: "crm",
					entity: "contact",
					action: MCP_ACTION.CREATE,
					arguments: {
						contact: {
							type: MCP_ARGUMENT_TYPE.STRUCTURE,
							description: "Structure without children",
						},
					},
				},
			}),
		).toThrow(ConfigFileError)
	})
})
