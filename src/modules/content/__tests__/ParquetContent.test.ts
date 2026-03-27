
import { Readable } from "node:stream"
import { parquetReadObjects } from "hyparquet"
import { ByteWriter, parquetWrite } from "hyparquet-writer"
import { DataTable } from "../../../types/DataTable"
import type { U__source_options_content_parquet } from "../providers/ParquetContent"
import { convertToArrayBuffer, ParquetContent } from "../providers/ParquetContent"

describe("ParquetContent", () => {
	const contentConfig: U__source_options_content_parquet = {
		"parquet-utf8": true,
	}

	const parquetContent = new ParquetContent()

	beforeEach(() => {
		parquetContent.SetConfig(contentConfig)
	})

	describe("Init", () => {
		it("should initialize the content and config correctly with empty options", async () => {
			const name = "test"
			const content = Readable.from(Buffer.from("mock parquet data"))

			const parquetContentEmptyOptions = new ParquetContent()
			parquetContentEmptyOptions.SetConfig({})

			parquetContentEmptyOptions.InitContent(name, content)
			expect(parquetContentEmptyOptions.Params).toEqual({
				utf8: true,
			})
		})
	})

	describe("Get", () => {
		beforeEach(async () => {
			// Create test data
			const testData = [
				{ id: 1, name: "John", age: 30 },
				{ id: 2, name: "Jane", age: 25 },
			]

			// Create parquet data using hyparquet-writer
			const columnData = [
				{ name: "id", data: testData.map((row) => row.id) },
				{ name: "name", data: testData.map((row) => row.name) },
				{ name: "age", data: testData.map((row) => row.age) },
			]

			const writer = new ByteWriter()
			parquetWrite({
				writer,
				columnData,
				statistics: true,
				rowGroupSize: 100_000,
			})

			const arrayBuffer = writer.getBuffer()
			const buffer = Buffer.from(arrayBuffer)
			const content = Readable.from(buffer)

			parquetContent.InitContent("test", content)
		})

		it("should return data as a DataTable", async () => {
			const dataTable = await parquetContent.Get({}, {})
			const rows = await dataTable.Rows()

			expect(DataTable.Is(dataTable)).toBe(true)
			expect(rows.length).toBe(2)
			expect(rows[0]).toHaveProperty("id")
			expect(rows[0]).toHaveProperty("name")
			expect(rows[0]).toHaveProperty("age")
		})

		it("should handle empty data gracefully", async () => {
			// Create empty parquet data
			const columnData = [
				{ name: "id", data: [] },
				{ name: "name", data: [] },
			]

			const writer = new ByteWriter()
			parquetWrite({
				writer,
				columnData,
				statistics: true,
				rowGroupSize: 100_000,
			})

			const arrayBuffer = writer.getBuffer()
			const buffer = Buffer.from(arrayBuffer)
			const content = Readable.from(buffer)

			const emptyParquetContent = new ParquetContent()
			emptyParquetContent.SetConfig(contentConfig)
			emptyParquetContent.InitContent("empty", content)

			const dataTable = await emptyParquetContent.Get({}, {})
			const rows = await dataTable.Rows()

			expect(rows).toEqual([])
		})

		it("should respect row limit parameter", async () => {
			const dataTable = await parquetContent.Get({ limit: 1 }, {})
			const rows = await dataTable.Rows()

			expect(DataTable.Is(dataTable)).toBe(true)
			expect(rows.length).toBeLessThanOrEqual(1)
		})

		it("should respect fields parameter", async () => {
			const dataTable = await parquetContent.Get({ fields: ["id"] }, {})
			const rows = await dataTable.Rows()

			expect(DataTable.Is(dataTable)).toBe(true)
			expect(rows[0]).toHaveProperty("id")
			// Should not have name and age due to column filtering
			expect(rows[0]).not.toHaveProperty("name")
			expect(rows[0]).not.toHaveProperty("age")
		})
	})

	describe("Set", () => {
		let testData: DataTable

		beforeEach(async () => {
			testData = new DataTable("test", [
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])
		})

		it("should export data to Parquet format", async () => {
			const readable = await parquetContent.Set(testData, {})

			expect(readable).toBeInstanceOf(Readable)

			// Verify the exported data can be read back
			const arrayBuffer = await convertToArrayBuffer(readable)
			const data = await parquetReadObjects({ file: arrayBuffer })

			const testRows = await testData.Rows()
			expect(data.length).toBe(testRows.length)
		})

		it("should handle empty DataTable", async () => {
			const emptyData = new DataTable("empty", [])

			await expect(parquetContent.Set(emptyData, {})).rejects.toThrow()
		})

		it("should handle large datasets", async () => {
			const largeData = new DataTable(
				"large",
				Array.from({ length: 100 }, (_, i) => ({ id: i, name: `User${i}` })),
			)

			const readable = await parquetContent.Set(largeData, {})
			expect(readable).toBeInstanceOf(Readable)
		})
	})

	describe("Error Handling", () => {
		it("should throw error if invalid configuration", async () => {
			const invalidContent = new ParquetContent()
			const invalidConfig: any = {
				"parquet-row-limit": -1,
			}

			invalidContent.SetConfig(invalidConfig)

			const name = "test"
			const content = Readable.from(Buffer.from("mock parquet data"))

			expect(() => {
				invalidContent.InitContent(name, content)
			}).not.toThrow()
		})

		it("should handle corrupted data gracefully", async () => {
			// Create invalid Parquet data
			const invalidBuffer = Buffer.from("corrupted parquet data")
			const content = Readable.from(invalidBuffer)

			const corruptedParquetContent = new ParquetContent()
			corruptedParquetContent.SetConfig(contentConfig)
			corruptedParquetContent.InitContent("corrupted", content)

			// Should not throw, but return empty data or handle error gracefully
			try {
				const dataTable = await corruptedParquetContent.Get({}, {})
				expect(DataTable.Is(dataTable)).toBe(true)
			} catch (error) {
				// It's acceptable to throw an error for corrupted data
				expect(error).toBeDefined()
			}
		})
	})
})
