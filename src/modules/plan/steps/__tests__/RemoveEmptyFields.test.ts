/** biome-ignore-all lint/suspicious/noExplicitAny: <explanation> */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import { RemoveEmptyFields } from "../RemoveEmptyFields"

// Test data setup
const testData = new DataTable("testData")


describe("RemoveEmptyFields", () => {
	beforeEach(async () => {
		vi.clearAllMocks()
		await testData.RowsSet([
			{ name: "David", age: 28, email: "david@test.com", phone: "", notes: null, score: 0, active: true },
			{ name: "", age: null, email: "eve@test.com", phone: "123-456-7890", notes: " ", score: 85, active: false },
			{ name: "Frank", age: undefined, email: "", phone: null, notes: undefined, score: null, active: true },
		])
		testData.MetaDataSet = vi.fn().mockReturnThis()
	})

	it("defaults only → ALL fields processed with defaults", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
				"blank-string": true,
			}
		}, $context)
		const rows = await result.Rows()

		// ALL fields should be processed with defaults
		expect(rows[0]).toEqual({
			name: "David",
			age: 28,
			email: "david@test.com",
			score: 0,
			active: true
		})

		expect(rows[1]).toEqual({
			email: "eve@test.com",
			phone: "123-456-7890",
			score: 85,
			active: false
		})

		expect(rows[2]).toEqual({
			name: "Frank",
			active: true
		})
	})

	it("fields: → ONLY listed fields processed with defaults", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
			},
			fields: {
				email: null,
				phone: null
			}
		}, $context)
		const rows = await result.Rows()

		// Only email and phone processed, others kept as-is
		expect(rows[0]).toEqual({
			name: "David",
			age: 28,
			email: "david@test.com",
			notes: null,
			score: 0,
			active: true
		})

		expect(rows[1]).toEqual({
			name: "",
			age: null,
			email: "eve@test.com",
			phone: "123-456-7890",
			notes: " ",
			score: 85,
			active: false
		})
	})

	it("fields:{config} → listed fields use merged config", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
			},
			fields: {
				email: null, // uses defaults
				phone: {
					"blank-string": true // override - adds blankString check
				}
			}
		}, $context)
		const rows = await result.Rows()

		// email uses defaults, phone has merged config
		expect(rows[0]).toEqual({
			name: "David",
			age: 28,
			email: "david@test.com",
			notes: null,
			score: 0,
			active: true
		})
	})

	it("unlisted fields → skipped when fields map present", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
			},
			fields: {
				email: null
			}
		}, $context)
		const rows = await result.Rows()

		// Only email processed, phone kept even though empty
		expect(rows[0]).toEqual({
			name: "David",
			age: 28,
			email: "david@test.com",
			phone: "", // kept - not in fields map
			notes: null,
			score: 0,
			active: true
		})
	})

	it("nested fields → dot notation support", async () => {
		const nestedData = new DataTable("nestedData", [
			{ name: "John", "user.address.city": null, "user.address.zip": "" },
			{ name: "Jane", "user.address.city": "NYC", "user.address.zip": "10001" },
		])
		await nestedData.RowsSet()

		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: nestedData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
			},
			fields: {
				"user.address.city": null,
				"user.address.zip": null
			}
		}, $context)
		const rows = await result.Rows()

		expect(rows[0]).toEqual({
			name: "John",
			"user.address.city": undefined,
			"user.address.zip": undefined
		})

		expect(rows[1]).toEqual({
			name: "Jane",
			"user.address.city": "NYC",
			"user.address.zip": "10001"
		})
	})

	it("each drop rule → null, '', '   ', 'null', 0, false, [] {}", async () => {
		const allTypesData = new DataTable("allTypesData", [
			{ name: "John", nullField: null, emptyString: "", blankString: "   ", stringNull: "null", zero: 0, falseField: false, emptyArray: [], emptyObject: {} },
			{ name: "Jane", nullField: "value", emptyString: "text", blankString: "text", stringNull: "text", zero: 1, falseField: true, emptyArray: [1], emptyObject: { key: "value" } },
		])
		await allTypesData.RowsSet()

		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: allTypesData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
				"blank-string": true,
				"string-null": true,
				zero: true,
				false: true,
				"empty-array": true,
				"empty-object": true,
			}
		}, $context)
		const rows = await result.Rows()

		expect(rows[0]).toEqual({
			name: "John"
		})

		expect(rows[1]).toEqual({
			name: "Jane",
			nullField: "value",
			emptyString: "text",
			blankString: "text",
			stringNull: "text",
			zero: 1,
			falseField: true,
			emptyArray: [1],
			emptyObject: { key: "value" }
		})
	})

	it("mixed types across records → type-safe checking per record", async () => {
		const mixedData = new DataTable("mixedData", [
			{ name: "John", value: null },
			{ name: "Jane", value: "" },
			{ name: "Bob", value: 0 },
			{ name: "Alice", value: false },
			{ name: "Charlie", value: [] },
			{ name: "Diana", value: {} },
		])
		await mixedData.RowsSet()

		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: mixedData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"null": true,
				"empty-string": true,
				zero: true,
				false: true,
				"empty-array": true,
				"empty-object": true,
			}
		}, $context)
		const rows = await result.Rows()

		expect(rows[0]?.value).toBeUndefined()
		expect(rows[1]?.value).toBeUndefined()
		expect(rows[2]?.value).toBeUndefined()
		expect(rows[3]?.value).toBeUndefined()
		expect(rows[4]?.value).toBeUndefined()
		expect(rows[5]?.value).toBeUndefined()
	})

	it("whitespace variants → tabs, newlines, mixed whitespace", async () => {
		const whitespaceData = new DataTable("whitespaceData", [
			{ name: "John", notes: "   " },
			{ name: "Jane", notes: "\t\t" },
			{ name: "Bob", notes: "\n\n" },
			{ name: "Alice", notes: " \t\n " },
		])
		await whitespaceData.RowsSet()

		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: whitespaceData,
			},
		}

		const result = await RemoveEmptyFields({
			defaults: {
				"blank-string": true
			}
		}, $context)
		const rows = await result.Rows()

		expect(rows[0]?.notes).toBeUndefined()
		expect(rows[1]?.notes).toBeUndefined()
		expect(rows[2]?.notes).toBeUndefined()
		expect(rows[3]?.notes).toBeUndefined()
	})

	it("empty config should throw error", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		// Should throw error when null is passed as stepParams
		await expect(RemoveEmptyFields(null, $context)).rejects.toThrow()
	})

	it("invalid config keys → Zod validation error", async () => {
		const $context: Partial<TContext> = {
			$plan: {
				name: "myPlan",
				currentStep: {
					index: 0,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: testData,
			},
		}

		// This should be caught by Zod validation
		await expect(RemoveEmptyFields({
			defaults: {
				invalidKey: true
			}
		} as any, $context)).rejects.toThrow()
	})
})
