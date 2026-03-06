import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TStep } from "../../types/TStep"
import { MAP_ON_ERROR } from "../../types/U_config_plans_params"
import { MapRows } from "../MapRows"

vi.mock("../../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "debug",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: console.log,
		Error: console.error,
		Debug: console.log,
		In: "",
		Out: "",
	},
}))

describe("Map step", () => {
	let testDataTable: DataTable

	beforeEach(() => {
		testDataTable = new DataTable("test", [
			{ price: 10, quantity: 2, category: "electronics" },
			{ price: 5, quantity: 3, category: "books" },
			{ price: 20, quantity: 1, category: "clothing" },
		])
	})

	it("should transform data using custom JavaScript code", async () => {
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: testDataTable,
			stepArgs: {
				script: `
                    $row.total = $row.price * $row.quantity;
                    $row.category = $row.category.toUpperCase();
                    return $row;
                `,
			},
		}

		const result = await MapRows(step)

		expect(result).toBeInstanceOf(DataTable)
		expect(result.Name).toBe("test_mapped")

		const rows = await result.Rows()
		expect(rows).toHaveLength(3)

		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "ELECTRONICS",
			total: 20,
		})

		expect(rows[1]).toEqual({
			price: 5,
			quantity: 3,
			category: "BOOKS",
			total: 15,
		})

		expect(rows[2]).toEqual({
			price: 20,
			quantity: 1,
			category: "CLOTHING",
			total: 20,
		})
	})

	it("should return original row if script does not return anything", async () => {
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: testDataTable,
			stepArgs: {
				script: `
                    $row.processed = true;
                    // No return statement
                `,
			},
		}

		const result = await MapRows(step)
		const rows = await result.Rows()

		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "electronics",
			processed: true,
		})
	})

	it("should handle empty data table", async () => {
		const emptyDataTable = new DataTable("empty", [])
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: emptyDataTable,
			stepArgs: {
				script: `
                    $row.total = $row.price * $row.quantity;
                    return $row;
                `,
			},
		}

		const result = await MapRows(step)
		const rows = await result.Rows()

		expect(rows).toHaveLength(0)
	})

	it("should throw error by default when script fails", async () => {
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: testDataTable,
			stepArgs: {
				script: `
                    // This will cause an error for the second row
                    if ($row.category === 'books') {
                        throw new Error('Books are not allowed');
                    }
                    $row.processed = true;
                    return $row;
                `,
			},
		}

		// Default behavior should throw an error
		await expect(MapRows(step)).rejects.toThrow()
	})

	it("should skip rows when on-error is set to skip", async () => {
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: testDataTable,
			stepArgs: {
				script: `
                    // This will cause an error for the second row
                    if ($row.category === 'books') {
                        throw new Error('Books are not allowed');
                    }
                    $row.processed = true;
                    return $row;
                `,
				"on-error": MAP_ON_ERROR.SKIP,
			},
		}

		const result = await MapRows(step)
		expect(result).toBeInstanceOf(DataTable)

		const rows = await result.Rows()

		// Should have only 2 rows (books row skipped)
		expect(rows).toHaveLength(2)

		// First row (electronics) should be processed successfully
		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "electronics",
			processed: true,
		})

		// Third row (clothing) should be processed successfully (skipped books row)
		expect(rows[1]).toEqual({
			price: 20,
			quantity: 1,
			category: "clothing",
			processed: true,
		})
	})

	it("should mark rows with error when on-error is set to mark", async () => {
		const step: TStep = {
			currentPlanName: "test-plan",
			currentSchemaName: "test-schema",
			currentDataTable: testDataTable,
			stepArgs: {
				script: `
                    // This will cause an error for the second row
                    if ($row.category === 'books') {
                        throw new Error('Books are not allowed');
                    }
                    $row.processed = true;
                    return $row;
                `,
				"on-error": MAP_ON_ERROR.MARK,
			},
		}

		const result = await MapRows(step)
		expect(result).toBeInstanceOf(DataTable)

		const rows = await result.Rows()

		// Should have all 3 rows
		expect(rows).toHaveLength(3)

		// First row (electronics) should be processed successfully
		expect(rows[0]).toEqual({
			price: 10,
			quantity: 2,
			category: "electronics",
			processed: true,
		})

		// Second row (books) should be marked with error
		expect(rows[1]).toEqual({
			price: 5,
			quantity: 3,
			category: "books",
			__map_error__: "Error: Books are not allowed",
		})

		// Third row (clothing) should be processed successfully
		expect(rows[2]).toEqual({
			price: 20,
			quantity: 1,
			category: "clothing",
			processed: true,
		})
	})
})
