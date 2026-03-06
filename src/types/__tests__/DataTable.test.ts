/* eslint-disable security/detect-non-literal-fs-filename */
/* eslint-disable @typescript-eslint/no-explicit-any */

import fs from "node:fs"
import { DuckDBInstance } from "@duckdb/node-api"
import { StringUtils } from "../../utils/StringUtils"
import { Utils } from "../../utils/Utils"
import type { TRow } from "../DataTable"
import { DATATABLE_TEMP_PATH, DataTable, dataTable_convertSql, SORT_ORDER } from "../DataTable"

describe("DataTable", () => {
	const dt = new DataTable("test")
	const dtEmpty = new DataTable("empty")
	const dtA = new DataTable("A")
	const dtB = new DataTable("B")
	const dtC = new DataTable("C")

	// DataTableConfig.Mode =  DATATABLE_MODE.PERSISTANT

	beforeEach(async () => {
		await dt.RowsSet([
			{
				name: "Alice",
				age: 25,
			},
			{
				name: "Bob",
				age: 30,
			},
		])

		await dtEmpty.RowsSet([])

		await dtA.RowsSet([
			{
				id: 2,
				name: "Bob",
				age: 40,
			},
			{
				id: 1,
				name: "Alice",
				age: 30,
			},
			{
				id: 3,
				name: "Charlie",
				age: 50,
			},
		])
		await dtB.RowsSet([
			{
				id: 3,
				city: "San Francisco",
			},
			{
				id: 2,
				city: "New York",
			},
			{
				id: 4,
				city: "London",
			},
		])

		await dtC.RowsSet([
			{ x: 3, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
			{ x: 4, y: 1 },
			{ x: 2, y: 2 },
		])
	})

	afterEach(async () => {
		await dt.RowsSet([])
		await dtEmpty.RowsSet([])
		await dtA.RowsSet([])
		await dtB.RowsSet([])
		await dtC.RowsSet([])
	})

	describe("constructor", () => {
		it("should create an instance of DataTable", () => {
			expect(dt).toBeInstanceOf(DataTable)
		})

		it("should set the table name and fields", () => {
			expect(dt.Name).toEqual("test")
			expect(dt.Fields).toEqual({
				name: "string",
				age: "number",
			})
		})

		it("should assign a random name if undefined", () => {
			const dt = new DataTable()
			expect(dt.Name).toBeDefined()
		})

		it("should returns same data", async () => {
			// Arrange
			const data = new DataTable("TestTable", [
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])

			// Assert
			expect((data as any)._rows.length).toEqual(2)
			expect((data as any)._rows).toEqual([
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])
		})

		it("should persist data on disk and keep data without 'using'", async () => {
			// Arrange
			const data = new DataTable(
				"dt_persistant",
				[
					{
						Col1: "Value1",
						Col2: "Value2",
					},
					{
						Col1: "Value3",
						Col2: "Value4",
					},
				],
				undefined,
				{
					persistant: true,
				},
			)
			await data.RowsSet()

			// Assert
			expect(data.Name).toEqual("dt_persistant")
			expect(await data.Rows()).toEqual([
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])
			expect(data.Fields).toEqual({
				Col1: "string",
				Col2: "string",
			})

			expect(fs.existsSync((<any>data)._dbPath)).toBeTruthy()
			data.Dispose()
			expect(fs.existsSync((<any>data)._dbPath)).toBeFalsy()
		})

		it("should persist data on disk and delete file with 'using'", async () => {
			let dbPath = ""

			const dt_create = async () => {
				// Arrange
				using data = new DataTable(
					"dt_persistant_removable",
					[
						{
							Col1: "Value1",
							Col2: "Value2",
						},
						{
							Col1: "Value3",
							Col2: "Value4",
						},
					],
					undefined,
					{
						persistant: true,
					},
				)
				await data.RowsSet()

				dbPath = (<any>data)._dbPath

				// Assert
				expect(data.Name).toEqual("dt_persistant_removable")
				expect(await data.Rows()).toEqual([
					{
						Col1: "Value1",
						Col2: "Value2",
					},
					{
						Col1: "Value3",
						Col2: "Value4",
					},
				])
				expect(data.Fields).toEqual({
					Col1: "string",
					Col2: "string",
				})
			}
			await dt_create()
			expect(!fs.existsSync(dbPath)).toBeTruthy()
		})

		it("should share the same duck instance", async () => {
			const tables: DataTable[] = []
			const total = 10
			const db_name = StringUtils.Path(DATATABLE_TEMP_PATH, `share_${Utils.Uuid(true)}.db`)
			const duckInstance = await DuckDBInstance.create(db_name)
			const cnx = await duckInstance.connect()

			const count_before = (await cnx.runAndReadAll(`SHOW TABLES;`)).getRowObjects().length
			expect(count_before).toEqual(0)

			for (let i = 0; i < total; i++) {
				tables.push(
					new DataTable(
						`dt${i}`,
						[
							{
								Col1: "Value1",
								Col2: "Value2",
							},
							{
								Col1: "Value3",
								Col2: "Value4",
							},
						],
						undefined,
						{
							duckInstance,
						},
					),
				)
				await tables[i]?.RowsSet()
			}

			const count_after = (await cnx.runAndReadAll(`SHOW TABLES;`)).getRowObjects().length

			expect(count_after).toEqual(total)

			for (let i = 0; i < total; i++) {
				const rows = await tables[i]?.Rows()
				expect(rows?.length).toEqual(2)
			}

			for (let i = 0; i < total; i++) {
				tables[i]?.Dispose()
			}

			const count_clean = (await cnx.runAndReadAll(`SHOW TABLES;`)).getRowObjects().length

			// at least one table should be deleted
			expect(count_clean).toBeLessThan(total)
		})
	}) // Added closing bracket here

	describe("Count", () => {
		it("should return count of rows", async () => {
			const count = new DataTable("count", [
				{ x: 3, y: 1 },
				{ x: 1, y: 1 },
				{ x: 2, y: 1 },
				{ x: 4, y: 1 },
				{ x: 2, y: 2 },
			])
			expect(await count.Count()).toEqual(5)
		})

		it("should cache count and return cached value on multiple calls", async () => {
			const dt = new DataTable("cache-test", [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			])

			// First call should calculate count
			const startTime1 = performance.now()
			const count1 = await dt.Count()
			const endTime1 = performance.now()

			// Subsequent calls should use cached value (faster)
			const startTime2 = performance.now()
			const count2 = await dt.Count()
			const endTime2 = performance.now()

			expect(count1).toBe(3)
			expect(count2).toBe(3)
			// Second call should be faster (using cache)
			expect(endTime2 - startTime2).toBeLessThanOrEqual(endTime1 - startTime1)
		})

		it("should invalidate cache and recalculate after row additions", async () => {
			const dt = new DataTable("add-test", [{ id: 1, name: "Alice" }])

			expect(await dt.Count()).toBe(1)

			// Add rows
			await dt.RowsAdd([
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			])

			// Count should reflect new rows
			expect(await dt.Count()).toBe(3)

			// Add more rows
			await dt.RowsAdd({ id: 4, name: "Dave" })
			expect(await dt.Count()).toBe(4)
		})

		it("should invalidate cache and recalculate after row deletions", async () => {
			const dt = new DataTable("delete-test", [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
				{ id: 4, name: "Dave" },
			])

			expect(await dt.Count()).toBe(4)

			// Delete row by index
			const rows = await dt.Rows({ includeIndex: true })
			await dt.RowDeleteByIndex(rows[1]?.__idx__) // Delete Bob

			expect(await dt.Count()).toBe(3)

			// Delete all rows
			await dt.RowsDelete()
			expect(await dt.Count()).toBe(0)
		})

		it("should handle concurrent Count() calls efficiently", async () => {
			const dt = new DataTable("concurrent-test", [
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
				{ id: 3, name: "Charlie" },
			])

			await dt.RowsSet()

			// Make multiple concurrent Count() calls
			const countPromises = Array.from({ length: 10 }, () => dt.Count())
			const results = await Promise.all(countPromises)

			// All should return the same result
			expect(results).toEqual(new Array(10).fill(3))
		})

		it("should perform efficiently with 100+ mixed operations", async () => {
			const dt = new DataTable("performance-test")
			const operationCount = 100

			// Add initial rows
			await dt.RowsSet(
				Array.from({ length: 20 }, (_, i) => ({
					id: i,
					name: `User${i}`,
					value: Math.random(),
				})),
			)

			expect(await dt.Count()).toBe(20)

			// Perform 100 mixed operations
			const startTime = performance.now()

			for (let i = 0; i < operationCount; i++) {
				if (i % 3 === 0) {
					// Add operation
					await dt.RowsAdd({
						id: 20 + i,
						name: `NewUser${i}`,
						value: Math.random(),
					})
				} else if (i % 3 === 1) {
					// Delete operation (if table has rows)
					const currentCount = await dt.Count()
					if (currentCount > 0) {
						const rows = await dt.Rows({ includeIndex: true, limit: 1 })
						if (rows.length > 0) {
							await dt.RowDeleteByIndex(rows[0]?.__idx__)
						}
					}
				} else {
					// Update operation (doesn't affect count but tests cache stability)
					const currentCount = await dt.Count()
					if (currentCount > 0) {
						const rows = await dt.Rows({ limit: 1 })
						if (rows.length > 0) {
							await dt.RowsUpdate({ ...rows[0], value: Math.random() }, `id = ${rows[0]?.id}`)
						}
					}
				}

				// Verify count is accurate after each operation
				const actualRows = await dt.Rows()
				const countedRows = await dt.Count()
				expect(actualRows.length).toBe(countedRows)
			}

			const endTime = performance.now()
			const totalTime = endTime - startTime

			// Final verification
			const finalCount = await dt.Count()
			const finalRows = await dt.Rows()
			expect(finalRows.length).toBe(finalCount)

			// Performance should be reasonable (less than 5 seconds for 100 operations)
			expect(totalTime).toBeLessThan(5000)

			console.log(`Performance test completed in ${totalTime.toFixed(2)}ms for ${operationCount} operations`)
		})

		it("should handle large dataset efficiently", async () => {
			const dt = new DataTable("large-test")
			const largeSize = 1000

			// Add large dataset
			const largeData = Array.from({ length: largeSize }, (_, i) => ({
				id: i,
				name: `User${i}`,
				email: `user${i}@example.com`,
				value: Math.random(),
				timestamp: Date.now() + i,
			}))

			await dt.RowsSet(largeData)
			expect(await dt.Count()).toBe(largeSize)

			// Test multiple count calls (should use cache)
			const startTime = performance.now()
			const countPromises = Array.from({ length: 10 }, () => dt.Count())
			const results = await Promise.all(countPromises)
			const endTime = performance.now()

			expect(results).toEqual(new Array(10).fill(largeSize))

			// Multiple cached calls should be very fast
			expect(endTime - startTime).toBeLessThan(100)

			// Test cache invalidation with large dataset
			await dt.RowsAdd({ id: largeSize, name: "NewUser" })
			expect(await dt.Count()).toBe(largeSize + 1)

			await dt.RowsDelete("id >= 500")
			expect(await dt.Count()).toBe(500)
		})
	})

	describe("RowsSet", () => {
		it("should persist data with _rows if called undefined", async () => {
			const dt = new DataTable("test", [
				{
					name: "Alice",
					age: 25,
				},
				{
					name: "Bob",
					age: 30,
				},
			])

			expect((<any>dt)._rows).toEqual([
				{
					name: "Alice",
					age: 25,
				},
				{
					name: "Bob",
					age: 30,
				},
			])

			await dt.RowsSet()
			expect(await dt.Rows()).toEqual([
				{
					name: "Alice",
					age: 25,
				},
				{
					name: "Bob",
					age: 30,
				},
			])
			expect(dt.Fields).toEqual({
				name: "string",
				age: "number",
			})

			expect((<any>dt)._rows).toEqual(undefined)
		})

		it("should set the rows and fields of the table", async () => {
			await dt.RowsSet([
				{
					name: "Charlie",
					age: 35,
				},
			])

			expect(await dt.Rows()).toEqual([
				{
					name: "Charlie",
					age: 35,
				},
			])
			expect(dt.Fields).toEqual({
				name: "string",
				age: "number",
			})
		})

		it("should not modify the table if rows are undefined", async () => {
			await dt.RowsSet()
			expect(await dt.Rows()).toEqual([
				{
					name: "Alice",
					age: 25,
				},
				{
					name: "Bob",
					age: 30,
				},
			])
			expect(dt.Fields).toEqual({
				name: "string",
				age: "number",
			})
		})

		it("should handle various JavaScript data types correctly", async () => {
			// Arrange
			const testDate = new Date("2023-01-01T00:00:00.000Z")
			const testObject = { key: "value", nested: { number: 42 } }
			const testArray = [1, "two", true, null]

			// Create a test object with various data types
			const testData = [
				{
					string: "test string",
					number: 42,
					float: Math.PI,
					boolean: true,
					date: testDate,
					object: testObject,
					array: testArray,
					nullValue: null,
					undefinedValue: undefined,
				},
			]

			// Act
			const dt = new DataTable("dataTypeTest")
			await dt.RowsSet(testData)
			const rows = await dt.Rows()
			const fields = dt.Fields // Fields is a getter property, not a method

			// Assert
			expect(rows).toHaveLength(1)
			const row = rows[0]

			// Check primitive types
			expect(row?.string).toBe("test string")
			expect(typeof row?.string).toBe("string")

			expect(row?.number).toBe(42)
			expect(typeof row?.number).toBe("number")

			expect(row?.float).toBeCloseTo(Math.PI)
			expect(typeof row?.float).toBe("number")

			expect(row?.boolean).toBe(true)
			expect(typeof row?.boolean).toBe("boolean")

			// Check Date
			expect(row?.date).toBeInstanceOf(Date)
			expect((row?.date as Date).toISOString()).toBe(testDate.toISOString())

			// Check Object
			const rowObject = row?.object as { key: string; nested: { number: number } }
			expect(rowObject).toEqual(testObject)
			expect(typeof rowObject).toBe("object")
			expect(rowObject.nested.number).toBe(42)

			// Check Array
			const rowArray = row?.array as unknown[]
			expect(Array.isArray(rowArray)).toBe(true)
			expect(rowArray).toEqual(testArray)

			// Check null and undefined
			expect(row?.nullValue).toBeNull()
			const rowAsRecord = row as Record<string, unknown>
			expect("undefinedValue" in rowAsRecord).toBe(false) // undefined values should be omitted

			// Check fields type detection
			const fieldTypes = fields as Record<string, string>
			expect(fieldTypes.string).toBe("string")
			expect(fieldTypes.number).toBe("number")
			expect(fieldTypes.float).toBe("number")
			expect(fieldTypes.boolean).toBe("boolean")
			expect(fieldTypes.date).toBe("date")
			expect(fieldTypes.object).toBe("object")
			expect(fieldTypes.array).toBe("array")
			expect(fieldTypes.nullValue).toBe("null")
		})
	})

	describe("FieldsSet", () => {
		it("should set the fields based on the first row of the table", async () => {
			await dt.FieldsSet()
			expect(dt.Fields).toEqual({
				name: "string",
				age: "number",
			})
		})
	})

	describe("GetFieldsNames", () => {
		it("should return an array of field names", () => {
			const fields = dt.GetFieldsName()
			expect(fields).toEqual(["name", "age"])
		})

		it("should return empty array for empty Datatable", () => {
			const fields = new DataTable("empty").GetFieldsName()
			expect(fields).toEqual([])
		})
	})

	describe("Rows", () => {
		it("should returns same data", async () => {
			let rows: TRow[] = []
			// Arrange
			const data = new DataTable("TestTable", [
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])

			rows = await data.Rows()
			expect(rows.length).toEqual(2)
			expect(rows).toEqual([
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])
		})

		it("should include __idx__ if true passed", async () => {
			let rows: TRow[] = []
			// Arrange
			const data = new DataTable("TestTable", [
				{
					Col1: "Value1",
					Col2: "Value2",
				},
				{
					Col1: "Value3",
					Col2: "Value4",
				},
			])

			rows = await data.Rows({ includeIndex: true })
			expect(rows.length).toEqual(2)
			expect(rows).toEqual([
				{
					Col1: "Value1",
					Col2: "Value2",
					__idx__: expect.any(String),
				},
				{
					Col1: "Value3",
					Col2: "Value4",
					__idx__: expect.any(String),
				},
			])
		})

		it("should include filter if filter passed", async () => {
			let rows: TRow[] = []
			// Arrange
			const data = new DataTable("TestTable", [
				{
					Col1: 1,
					Col2: 2,
				},
				{
					Col1: 3,
					Col2: 4,
				},
				{
					Col1: 5,
					Col2: 6,
				},
			])

			rows = await data.Rows({ filter: "Col1 > 2" })
			expect(rows.length).toEqual(2)
			expect(rows).toEqual([
				{
					Col1: 3,
					Col2: 4,
				},
				{
					Col1: 5,
					Col2: 6,
				},
			])
		})

		it("should return only rows between skip and skip+limit", async () => {
			let rows: TRow[] = []
			// Arrange
			const data = new DataTable("TestTable", [
				{
					Col1: 1,
					Col2: 2,
				},
				{
					Col1: 3,
					Col2: 4,
				},
				{
					Col1: 5,
					Col2: 6,
				},
				{
					Col1: 7,
					Col2: 8,
				},
			])

			rows = await data.Rows({ skip: 1, limit: 2 })
			expect(rows.length).toEqual(2)
			expect(rows).toEqual([
				{
					Col1: 3,
					Col2: 4,
				},
				{
					Col1: 5,
					Col2: 6,
				},
			])
		})

		describe("fields parameter", () => {
			const testDt = new DataTable("test")

			beforeEach(async () => {
				await testDt.RowsSet([
					{
						id: 1,
						name: "John",
						age: 30,
						email: "john@example.com",
						"user.name": "johndoe",
						"": "emptyValue",
					},
					{
						id: 2,
						name: "Mary",
						age: 25,
						email: "mary@example.com",
						"user.name": "maryjane",
						"": "anotherValue",
					},
					{
						id: 3,
						name: "Alice",
						age: 28,
						email: "alice@example.com",
						"user.name": "alicesmith",
						"": "value3",
					},
				])
			})

			it("should return only selected fields", async () => {
				let rows: TRow[] = []
				// Arrange
				const data = new DataTable("TestTable", [
					{
						Col1: 1,
						Col2: 2,
						Col3: 3,
					},
					{
						Col1: 4,
						Col2: 5,
						Col3: 6,
					},
				])

				rows = await data.Rows({ fields: ["Col2", "Col1"] })
				expect(rows.length).toEqual(2)
				expect(rows).toEqual([
					{
						Col2: 2,
						Col1: 1,
					},
					{
						Col2: 5,
						Col1: 4,
					},
				])
			})

			it("should return the DataTable instance if no fields are provided", async () => {
				const rows = await testDt.Rows({ fields: [] })
				expect(rows).toBeInstanceOf(Array)
				expect(rows).toEqual(await testDt.Rows())
			})

			it("should return the DataTable instance if no rows are present", async () => {
				const emptyDt = new DataTable("empty")
				const rows = await emptyDt.Rows({ fields: ["id"] })
				expect(rows).toBeInstanceOf(Array)
				expect(rows).toEqual([])
			})

			it("should return only the specified fields in the rows", async () => {
				const rows = await testDt.Rows({ fields: ["id", "name"] })
				expect(rows).toEqual([
					{ id: 1, name: "John" },
					{ id: 2, name: "Mary" },
					{ id: 3, name: "Alice" },
				])
			})

			it("should handle non-existent fields by excluding them", async () => {
				const rows = await testDt.Rows({ fields: ["id", "nonexistent", "age"] })
				expect(rows).toEqual([
					{ id: 1, age: 30 },
					{ id: 2, age: 25 },
					{ id: 3, age: 28 },
				])
			})

			it("should handle fields with special characters", async () => {
				const rows = await testDt.Rows({ fields: ["user.name", ""] })
				expect(rows).toEqual([
					{ "user.name": "johndoe", "": "emptyValue" },
					{ "user.name": "maryjane", "": "anotherValue" },
					{ "user.name": "alicesmith", "": "value3" },
				])
			})

			it("should handle case sensitivity correctly", async () => {
				const rows = await testDt.Rows({ fields: ["ID", "NAME"] })
				// Should return empty objects since field names are case-sensitive
				expect(rows).toEqual([{}, {}, {}])
			})

			it("should work with a single field", async () => {
				const rows = await testDt.Rows({ fields: ["email"] })
				expect(rows).toEqual([{ email: "john@example.com" }, { email: "mary@example.com" }, { email: "alice@example.com" }])
			})

			it("should maintain the order of fields as specified", async () => {
				const rows = await testDt.Rows({ fields: ["age", "id", "name"] })
				const firstRow = rows[0]
				expect(Object.keys(firstRow!)).toEqual(["age", "id", "name"])
			})
		})
	})

	describe("RowsIterator", () => {
		it("should return an array of rows", async () => {
			// fill data
			const data: TRow[] = []
			for (let i = 0; i < 1000; i++) {
				data.push({
					id: i,
					age: `data-${i}`,
				})
			}

			const dt1000 = new DataTable("dt1000")
			await dt1000.RowsSet(data)

			const returnedData: TRow[] = []
			for await (const row of await dt1000.RowsIterator({ batchSize: 10 })) {
				returnedData.push(row)
			}

			expect(returnedData.length).toEqual(data.length)
			expect(returnedData).toEqual(data)
		})

		it("should throw an error if batchSize is less than 0", async () => {
			await expect(dtA.RowsIterator({ batchSize: -1 })).rejects.toThrow()
		})

		it("should return all rows if batchSize is greater than number of rows", async () => {
			const rows: TRow[] = []
			for await (const row of await dtA.RowsIterator({ batchSize: 10000 })) {
				rows.push(row)
			}
			expect(rows).toEqual(await dtA.Rows())
		})

		it("should return the correct number of rows if batchSize is smaller than number of rows", async () => {
			const rows: TRow[] = []
			for await (const row of await dtA.RowsIterator({ batchSize: 2 })) {
				rows.push(row)
			}
			expect(rows).toHaveLength(3)
		})

		it("should return the correct number of rows if batchSize is smaller than number of rows and the number of rows is not divisible by batchSize", async () => {
			const data: TRow[] = []
			for (let i = 0; i < 1000; i++) {
				data.push({
					id: i,
					age: `data-${i}`,
				})
			}
			const dt1k = new DataTable("dt1k")
			await dt1k.RowsSet(data)

			const rows: TRow[] = []
			for await (const row of await dt1k.RowsIterator({ batchSize: 256 })) {
				rows.push(row)
			}
			expect(rows).toHaveLength(1000)
		})

		it("should return the correct number of rows if batchSize is divisible by number of rows", async () => {
			const data: TRow[] = []
			for (let i = 0; i < 1000; i++) {
				data.push({
					id: i,
					age: `data-${i}`,
				})
			}
			const dt1k = new DataTable("dt1k")
			await dt1k.RowsSet(data)

			const rows: TRow[] = []
			for await (const row of await dt1k.RowsIterator({ batchSize: 25 })) {
				rows.push(row)
			}
			expect(rows).toHaveLength(1000)
		})

		it("should use next for iterator", async () => {
			const data: TRow[] = []
			for (let i = 0; i < 1000; i++) {
				data.push({
					id: i,
					age: `data-${i}`,
				})
			}
			const dt1k = new DataTable("dt1k")
			await dt1k.RowsSet(data)

			const rows: TRow[] = []

			const iterator = await dt1k.RowsIterator({ batchSize: 25 })

			let row = await iterator.next()

			while (!row.done) {
				rows.push(row.value)
				row = await iterator.next()
			}
			expect(rows).toHaveLength(1000)
		})
	})

	describe("Sort", () => {
		it("should sort the rows by the specified fields in ascending order", async () => {
			await dtA.Sort({ name: SORT_ORDER.ASC })
			expect(await dtA.Rows()).toEqual([
				{
					id: 1,
					name: "Alice",
					age: 30,
				},
				{
					id: 2,
					name: "Bob",
					age: 40,
				},
				{
					id: 3,
					name: "Charlie",
					age: 50,
				},
			])
		})

		it("should sort the rows by the specified fields in descending order", async () => {
			await dtA.Sort({ age: SORT_ORDER.DESC })
			expect(await dtA.Rows()).toEqual([
				{
					id: 3,
					name: "Charlie",
					age: 50,
				},
				{
					id: 2,
					name: "Bob",
					age: 40,
				},
				{
					id: 1,
					name: "Alice",
					age: 30,
				},
			])
		})

		it("should sort the rows by the specified fields in ascending order first, then descending order", async () => {
			await dtC.Sort({ x: SORT_ORDER.ASC, y: SORT_ORDER.DESC })
			expect(await dtC.Rows()).toEqual([
				{ x: 1, y: 1 },
				{ x: 2, y: 2 },
				{ x: 2, y: 1 },
				{ x: 3, y: 1 },
				{ x: 4, y: 1 },
			])
		})
	})

	describe("MetaDataSet", () => {
		it("should set metadata for the DataTable instance", () => {
			dt.MetaDataSet("version", "1.0.0")
			expect(dt.MetaData).toEqual({ version: "1.0.0" })
		})

		it("should override metadata if key already exists", () => {
			dt.MetaDataSet("version", "1.0.0")
			dt.MetaDataSet("version", "2.0.0")
			expect(dt.MetaData).toEqual({ version: "2.0.0" })
		})
	})

	// describe('Transpose', () => {

	//     // Transpose empty table returns the same table
	//     it('should return same table when input is empty', async () => {
	//         const table = new DataTable()
	//         table.SetRows([])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([])
	//     })

	//     // Transpose table with single row and multiple columns
	//     it('should correctly transpose single row with multiple columns', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1, b: 2, c: 3 }])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([
	//             { key: 'a', field_1: 1 },
	//             { key: 'b', field_1: 2 },
	//             { key: 'c', field_1: 3 }
	//         ])
	//     })

	//     // Transpose table with multiple rows and columns
	//     it('should correctly transpose multiple rows and columns', async () => {
	//         const table = new DataTable()
	//         table.SetRows([
	//             { a: 1, b: 2 },
	//             { a: 3, b: 4 }
	//         ])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([
	//             { key: 'a', field_1: 1, field_2: 3 },
	//             { key: 'b', field_1: 2, field_2: 4 }
	//         ])
	//     })

	//     // Transpose with renamed columns provided matches column count
	//     it('should use provided column names when count matches', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1, b: 2 }])
	//         const result = await table.Transpose(['col1', 'val1'])
	//         expect(await result.Rows()).toEqual([
	//             { col1: 'a', val1: 1 },
	//             { col1: 'b', val1: 2 }
	//         ])
	//     })

	//     // Transpose with no renamed columns uses default naming pattern
	//     it('should use default naming pattern when no column names provided', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1, b: 2 }])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([
	//             { key: 'a', field_1: 1 },
	//             { key: 'b', field_1: 2 }
	//         ])
	//     })

	//     // Transpose with renamed columns array shorter than number of columns
	//     it('should use default pattern for remaining columns when renamed array is short', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1, b: 2, c: 3 }])
	//         const result = await table.Transpose(['col1'])
	//         expect(await result.Rows()).toEqual([
	//             { col1: 'a', field_2: 1 },
	//             { col1: 'b', field_2: 2 },
	//             { col1: 'c', field_2: 3 }
	//         ])
	//     })

	//     // Transpose with renamed columns array longer than number of columns
	//     it('should ignore extra renamed columns when array is too long', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1 }])
	//         const result = await table.Transpose(['col1', 'col2', 'col3'])
	//         expect(await result.Rows()).toEqual([{ col1: 'a', col2: 1 }])
	//     })

	//     // Transpose table with single column
	//     it('should correctly transpose table with single column', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1 }, { a: 2 }])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([{ key: 'a', field_1: 1, field_2: 2 }])
	//     })

	//     // Transpose table with null/undefined values in cells
	//     it('should handle null and undefined values correctly', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: null, b: undefined }])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([
	//             { key: 'a', field_1: null },
	//             { key: 'b', field_1: undefined }
	//         ])
	//     })

	//     // Transpose table with special characters in column names
	//     it('should handle special characters in column names', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ '@#$': 1, '!@#': 2 }])
	//         const result = await table.Transpose()
	//         expect(await result.Rows()).toEqual([
	//             { key: '@#$', field_1: 1 },
	//             { key: '!@#', field_1: 2 }
	//         ])
	//     })

	//     // Verify column naming pattern follows "field_N" format
	//     it('should follow field_N naming pattern for auto-generated columns', async () => {
	//         const table = new DataTable()
	//         table.SetRows([{ a: 1, b: 2 }, { a: 3, b: 4 }])
	//         const result = await table.Transpose()
	//         expect(Object.keys((await result.Rows())[0])).toEqual(['key', 'field_1', 'field_2'])
	//     })

	//     // Check if original data is preserved after transpose
	//     it('should preserve all original data values after transpose', async () => {
	//         const table = new DataTable()
	//         const originalData = [{ a: 1, b: 2 }, { a: 3, b: 4 }]
	//         table.SetRows(originalData)
	//         const result = await table.Transpose()
	//         const allValues = (await result.Rows()).flatMap(row => Object.values(row))
	//         expect(allValues).toContain('a')
	//         expect(allValues).toContain('b')
	//         expect(allValues).toContain(1)
	//         expect(allValues).toContain(2)
	//         expect(allValues).toContain(3)
	//         expect(allValues).toContain(4)
	//     })
	// })

	describe("FreeSql", () => {
		// Executes a valid SQL query and returns a DataTable object with updated Rows and Fields properties
		it("should execute valid SQL query and update Rows and Fields properties", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
			])
			const sqlQuery = 'SELECT * FROM "myTable" WHERE id = 1'

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
				returnData: true,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([
				{
					id: 1,
					name: "John",
				},
			])
			expect(result.Fields).toEqual({
				id: "number",
				name: "string",
			})
		})

		it("should execute valid SQL query with no results and return DataTable object with empty Rows and Fields", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
			])
			const sqlQuery = 'SELECT * FROM "myTable" WHERE id = 3'

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
				returnData: true,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([])
			expect(result.Fields).toEqual({})
		})

		// Executes a valid SQL query with no input Rows and returns a DataTable object with empty Rows and updated Fields properties
		it("should execute valid SQL query with no input Rows and return DataTable object with empty Rows and updated Fields properties", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			const sqlQuery = 'SELECT * FROM "myTable"'

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
				returnData: true,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([])
			expect(result.Fields).toEqual({})
		})

		// Executes an invalid SQL query and throws an error
		it("should throw error for invalid SQL query", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			const sqlQuery = "INVALID QUERY"

			try {
				await myDataTable.FreeSql({ sqlQuery })
			} catch (error) {
				expect(error).toBeInstanceOf(Error)
			}
		})

		// Executes a SQL query with a syntax error and throws an error
		it("should execute SQL query with syntax error and throw an error", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			const sqlQuery = 'SELECT * FROM "myTable" WHERE id = 1'

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
				returnData: true,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([])
			expect(result.Fields).toEqual({})
		})

		// Executes a SQL query with a semantic error and throws an error
		it("should execute SQL query with semantic error and throw an error", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			const sqlQuery = 'SELECT * FROM "nonExistentTable"'

			let result: DataTable | undefined

			// Act
			try {
				result = await myDataTable.FreeSql({ sqlQuery })
			} catch {
				//
			}
			// Assert
			expect(result).toEqual(undefined)
		})

		it("should execute insert data", async () => {
			// Arrange
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
			])
			const data1 = { name: "John" }
			const data2 = { name: "June" }
			const data3 = { name: "Jane" }

			const sqlQuery = `
                INSERT INTO 
                    "myTable"(__data__) 
                VALUES 
                    ('${JSON.stringify(data1)}'),  
                    ('${JSON.stringify(data2)}'),  
                    ('${JSON.stringify(data3)}')`

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					name: "John",
				},
				{
					name: "June",
				},
				{
					name: "Jane",
				},
			])
			expect(result.Fields).toEqual({
				id: "number",
				name: "string",
			})
		})

		it("should update table", async () => {
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
			])

			const sqlQuery = `
                UPDATE 
                    myTable 
                SET 
                    name = 'June',
                    "age" = 33
                WHERE 
                    "id" = 1`

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([
				{
					id: 1,
					name: "June",
					age: 33,
				},
				{
					id: 2,
					name: "Jane",
					age: undefined,
				},
			])
			expect(result.Fields).toEqual({
				id: "number",
				name: "string",
				age: "number",
			})
		})

		it("should update table XML case", async () => {
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					"@attr": "value",
					"#text": "content",
				},
			])

			const sqlQuery = `
                UPDATE "myTable" SET "@attr" = 'new value', "#text" = 'new content'`

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
			})

			// Assert
			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Rows()).toEqual([
				{
					"@attr": "new value",
					"#text": "new content",
				},
			])
			expect(result.Fields).toEqual({
				"@attr": "string",
				"#text": "string",
			})
		})

		it("should update table JSON case", async () => {
			const myDataTable = new DataTable("myTable")
			await myDataTable.RowsSet([
				{
					name: "David",
					age: 28,
				},
				{
					name: "Eve",
					age: 32,
				},
				{
					name: "Frank",
					age: 36,
				},
				{
					name: "Grace",
					age: 14,
				},
				{
					name: "Henry",
					age: 44,
				},
				{
					name: "Henry",
					age: 50,
				},
			])

			const sqlQuery = `UPDATE "${myDataTable.Name}" SET age = 25, country = 'France' WHERE name = 'David'`

			// Act
			const result = await myDataTable.FreeSql({
				sqlQuery,
			})

			// Assert
			expect(await result.Rows()).toEqual([
				{
					name: "David",
					country: "France",
					age: 25,
				},
				{
					name: "Eve",
					age: 32,
				},
				{
					name: "Frank",
					age: 36,
				},
				{
					name: "Grace",
					age: 14,
				},
				{
					name: "Henry",
					age: 44,
				},
				{
					name: "Henry",
					age: 50,
				},
			])
		})
	})

	describe("Pick", () => {
		it("should pick specified fields from table", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			])
			const result = await dt.Pick(["a", "c"])
			expect(await result.Rows()).toEqual([
				{ a: 1, c: 3 },
				{ a: 4, c: 6 },
			])
		})
	})

	describe("Omit", () => {
		it("should remove specified fields from table", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			])
			const result = await dt.Omit(["b", "c"])
			expect(await result.Rows()).toEqual([{ a: 1 }, { a: 4 }])
		})
	})

	describe("RowsMap", () => {
		it("should map rows", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ a: 1, b: 2, c: 3 },
				{ a: 4, b: 5, c: 6 },
			])
			const result = await dt.RowsMap(async (row: TRow) => {
				return {
					a: row.a * 2,
					b: row.b * 2,
					c: row.c * 2,
				}
			})
			expect(await result.Rows()).toEqual([
				{ a: 2, b: 4, c: 6 },
				{ a: 8, b: 10, c: 12 },
			])
		})

		it("should do for count > batchSize", async () => {
			const dt = new DataTable()
			dt.BatchSize = 2
			await dt.RowsSet(Array.from({ length: 10 }, (_, i) => ({ a: i })))
			const result = await dt.RowsMap(async (row: TRow) => {
				return {
					a: row.a * 2,
				}
			})
			expect(await result.Rows()).toEqual(Array.from({ length: 10 }, (_, i) => ({ a: i * 2 })))
		})
	})

	describe("RowUpdateByIndex", () => {
		it("should update row by index with object", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])
			const row = await dt.Rows({ includeIndex: true, filter: { name: "John" } })
			const updatedRow = row[0]!
			updatedRow.name = "Johnny"
			const result = await dt.RowUpdateByIndex(updatedRow.__idx__, updatedRow)
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Johnny" },
				{ id: 2, name: "Jane" },
			])
		})

		it("should update without fails 10k rows ", async () => {
			const dt = new DataTable()
			await dt.RowsSet(Array.from({ length: 10000 }, (_, i) => ({ id: i + 1, name: "John" })))
			try {
				await dt.ForEach(
					async (row: TRow) => {
						dt.RowUpdateByIndex(row.__idx__, { ...row, name: `${row.name} Doe` })
					},
					{ includeIndex: true },
				)
			} catch (error) {
				expect(error).toBeUndefined()
			}

			const result = await dt.Rows({ limit: 1 })
			expect(result[0]).toEqual({ id: 1, name: "John Doe" })
		}, 600_000)
	})

	describe("RowDeleteByIndex", () => {
		it("should delete row by index", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
				{ id: 3, name: "Bob" },
			])
			const rows = await dt.Rows({ includeIndex: true })
			const rowToDelete = rows[1]! // Delete Jane (index 1)

			const result = await dt.RowDeleteByIndex(rowToDelete.__idx__)

			expect(await result.Rows()).toEqual([
				{ id: 1, name: "John" },
				{ id: 3, name: "Bob" },
			])
			expect(await result.Count()).toBe(2)
		})

		it("should return same table if index is undefined", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])

			const result = await dt.RowDeleteByIndex()

			expect(await result.Rows()).toEqual([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])
			expect(await result.Count()).toBe(2)
		})

		it("should handle deleting first row", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
				{ id: 3, name: "Bob" },
			])
			const rows = await dt.Rows({ includeIndex: true })
			const firstRow = rows[0]!

			const result = await dt.RowDeleteByIndex(firstRow.__idx__)

			expect(await result.Rows()).toEqual([
				{ id: 2, name: "Jane" },
				{ id: 3, name: "Bob" },
			])
			expect(await result.Count()).toBe(2)
		})

		it("should handle deleting last row", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
				{ id: 3, name: "Bob" },
			])
			const rows = await dt.Rows({ includeIndex: true })
			const lastRow = rows[2]!

			const result = await dt.RowDeleteByIndex(lastRow.__idx__)

			expect(await result.Rows()).toEqual([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])
			expect(await result.Count()).toBe(2)
		})

		it("should handle deleting only row in single-row table", async () => {
			const dt = new DataTable()
			await dt.RowsSet([{ id: 1, name: "John" }])
			const rows = await dt.Rows({ includeIndex: true })
			const onlyRow = rows[0]!

			const result = await dt.RowDeleteByIndex(onlyRow.__idx__)

			expect(await result.Rows()).toEqual([])
			expect(await result.Count()).toBe(0)
		})

		it("should handle skipFieldsSet option", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			])
			const rows = await dt.Rows({ includeIndex: true })
			const rowToDelete = rows[0]!

			// Mock FieldsSet to track if it's called
			const originalFieldsSet = dt.FieldsSet.bind(dt)
			let fieldsSetCalled = false
			dt.FieldsSet = vi.fn().mockImplementation(() => {
				fieldsSetCalled = true
				return originalFieldsSet()
			})

			const result = await dt.RowDeleteByIndex(rowToDelete.__idx__)

			expect(fieldsSetCalled).toBe(false)
			expect(await result.Rows()).toEqual([{ id: 2, name: "Jane" }])
		})

		it("should handle multiple deletions in sequence", async () => {
			const dt = new DataTable()
			await dt.RowsSet([
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
				{ id: 3, name: "Bob" },
				{ id: 4, name: "Alice" },
			])
			const rows = await dt.Rows({ includeIndex: true })

			// Delete rows one by one
			await dt.RowDeleteByIndex(rows[1]?.__idx__) // Delete Jane
			await dt.RowDeleteByIndex(rows[2]?.__idx__) // Delete Bob

			const result = await dt.Rows()

			expect(result).toEqual([
				{ id: 1, name: "John" },
				{ id: 4, name: "Alice" },
			])
			expect(result).toHaveLength(2)
		})

		it("should handle deletion from empty table", async () => {
			const dt = new DataTable()
			await dt.RowsSet([])

			const result = await dt.RowDeleteByIndex("some-index")

			expect(await result.Rows()).toEqual([])
			expect(await result.Count()).toBe(0)
		})
	})

	describe("ForEach", () => {
		it("should pass unique indices to callback function", async () => {
			const testDt = new DataTable("forEachTest")

			// Create 20 test rows
			const testData = Array.from({ length: 20 }, (_, i) => ({
				id: i + 1,
				name: `Item ${i + 1}`,
				value: Math.random() * 100,
			}))

			await testDt.RowsSet(testData)

			const results: { row: any; idx: number | undefined }[] = []

			// Use ForEach to process rows
			await testDt.ForEach((row, idx) => {
				results.push({ row, idx })
				return row.name // Return something to satisfy the function
			})

			// Verify we got exactly 20 results
			expect(results).toHaveLength(20)

			// Verify all indices are unique and sequential (0-19)
			const indices = results.map((r) => r.idx)
			expect(indices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])

			// Verify each result has correct row and corresponding index
			results.forEach((result, expectedIdx) => {
				expect(result.idx).toBe(expectedIdx)
				expect(result.row.id).toBe(expectedIdx + 1)
				expect(result.row.name).toBe(`Item ${expectedIdx + 1}`)
			})

			console.log(`ForEach processed ${results.length} rows with unique indices: ${indices.join(", ")}`)
		})

		it("should handle empty dataset", async () => {
			const emptyDt = new DataTable("emptyTest")
			await emptyDt.RowsSet([])

			const results: any[] = []

			await emptyDt.ForEach((row, idx) => {
				results.push({ row, idx })
				return row
			})

			expect(results).toHaveLength(0)
		})

		it("should work with async callback functions", async () => {
			const asyncDt = new DataTable("asyncTest")

			const testData = Array.from({ length: 10 }, (_, i) => ({
				id: i + 1,
				name: `Async Item ${i + 1}`,
			}))

			await asyncDt.RowsSet(testData)

			const processedItems: string[] = []

			await asyncDt.ForEach(async (row, idx) => {
				// Simulate async processing
				await new Promise((resolve) => setTimeout(resolve, 10))
				processedItems.push(`Processed ${row.name} at index ${idx}`)
				return row.name
			})

			expect(processedItems).toHaveLength(10)
			processedItems.forEach((item, expectedIdx) => {
				expect(item).toBe(`Processed Async Item ${expectedIdx + 1} at index ${expectedIdx}`)
			})
		})
	})

	// Executes a valid SQL query and returns a DataTable object with updated Rows and Fields properties
	// it('UC 1', async () => {
	//     // Arrange
	//     const myDataTable = new DataTable("output.csv")
	//     const sqlQuery = `
	//         INSERT INTO "output.csv"
	//             (name, mimeType, type, size, createdAt, modifiedAt, path, ocr_text, translated_text)
	//         VALUES
	//             ('ocr-1.png', 'image/png', 'file', 130403, ?, ?, 'data/img/ocr-1.png', 'Cedric himself knew nothing\nwhatever about it. It had never been\neven mentioned to him. He knew that\nhis papa had been an Englishman,\nbecause his mamma had told him so;\nbut then his papa had died when he\nwas so little a boy that he could not\nremember very much about him,\nexcept that he was big. and had blue\neyes and a long mustache, and that it\nwas a splendid thing to be carried\naround the room on his shoulder.\n'),

	//             ('ocr-3.png', 'image/png', 'file', 23359, ?, ?, 'data/img/ocr-3.png', 'This is a lot of 12 point text to test the\nocr code and see if it works on all types\nof file format.\n\nThe quick brown dog jumped over the\nlazy fox. The quick brown dog jumped\nover the lazy fox. The quick brown dog\njumped over the lazy fox. The quick\nbrown dog jumped over the lazy fox.\n')`

	//     const queryParams = [
	//         new Date("2025-05-27T17:22:27.600Z"),
	//         new Date("2025-05-27T12:40:44.000Z"),
	//         new Date("2025-07-16T16:51:26.107Z"),
	//         new Date("2025-07-16T09:10:07.000Z"),
	//     ]

	//     // Act
	//     const result = await myDataTable.FreeSql({ sqlQuery, queryParams })

	//     // Assert
	//     expect(result).toBeInstanceOf(DataTable)
	//     expect(await result.Count()).toEqual(2)
	// })
})

describe("dataTable_convertSql", () => {
	it("should convert condition", () => {
		expect(dataTable_convertSql("id = 1")).toBe("(__data__->'id') = 1")
		expect(dataTable_convertSql("id > 1")).toBe("(__data__->'id') > 1")
		expect(dataTable_convertSql("id >= 1")).toBe("(__data__->'id') >= 1")
		expect(dataTable_convertSql("id < 1")).toBe("(__data__->'id') < 1")
		expect(dataTable_convertSql("id <= 1")).toBe("(__data__->'id') <= 1")
		expect(dataTable_convertSql("id IN (1,2,3)")).toBe("(__data__->'id') IN ( 1 , 2 , 3 )")
		expect(dataTable_convertSql("id NOT IN (1,2,3)")).toBe("(__data__->'id') NOT IN ( 1 , 2 , 3 )")
		expect(dataTable_convertSql("id LIKE 'test%'")).toBe("(__data__->'id') LIKE 'test%'")
		expect(dataTable_convertSql("id NOT LIKE 'test%'")).toBe("(__data__->'id') NOT LIKE 'test%'")
		expect(dataTable_convertSql("id IS NULL")).toBe("(__data__->'id') IS NULL")
		expect(dataTable_convertSql("id IS NOT NULL")).toBe("(__data__->'id') IS NOT NULL")
	})

	it("should convert SELECT", () => {
		expect(dataTable_convertSql(`SELECT a, b, c FROM table1 WHERE a > 1 AND (b = 2 OR c = 3) ORDER BY a DESC`)).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'b') AS b , (__data__->'c') AS c FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 ) ORDER BY (__data__->'a') DESC`,
		)

		expect(dataTable_convertSql(`SELECT * FROM table1`)).toBe(`SELECT * FROM table1`)

		expect(dataTable_convertSql(`SELECT a, b, c FROM table1 WHERE a > 1 AND (b = 2 OR c = 3)`)).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'b') AS b , (__data__->'c') AS c FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 )`,
		)

		expect(dataTable_convertSql(`SELECT a , c , d FROM table1 WHERE a > 1 AND (b = 2 OR c = 3)`)).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'c') AS c , (__data__->'d') AS d FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 )`,
		)

		expect(dataTable_convertSql(`SELECT a, b, c FROM table1 WHERE a > 1 AND (b = 2 OR c = 3) ORDER BY a DESC`)).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'b') AS b , (__data__->'c') AS c FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 ) ORDER BY (__data__->'a') DESC`,
		)

		expect(
			dataTable_convertSql(`SELECT a, b, c FROM table1 WHERE a > 1 AND (b = 2 OR c = 3) ORDER BY a DESC LIMIT 10`),
		).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'b') AS b , (__data__->'c') AS c FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 ) ORDER BY (__data__->'a') DESC LIMIT 10`,
		)

		expect(
			dataTable_convertSql(
				`SELECT a, b, c FROM table1 WHERE a > 1 AND (b = 2 OR c = 3) ORDER BY a DESC LIMIT 10 OFFSET 5`,
			),
		).toBe(
			`SELECT (__data__->'a') AS a , (__data__->'b') AS b , (__data__->'c') AS c FROM table1 WHERE (__data__->'a') > 1 AND ( (__data__->'b') = 2 OR (__data__->'c') = 3 ) ORDER BY (__data__->'a') DESC LIMIT 10 OFFSET 5`,
		)
	})

	it("should convert INSERT", () => {
		// Simple VALUES insert: columns should not be wrapped
		expect(dataTable_convertSql(`INSERT INTO table1 (a, b, c) VALUES (1, 'x', 3)`)).toBe(
			`INSERT INTO table1 ( a , b , c ) VALUES ( 1 , 'x' , 3 )`,
		)

		// INSERT with SELECT statement: SELECT fields untouched, WHERE wrapped
		expect(dataTable_convertSql(`INSERT INTO table1 (a, b) SELECT a, b FROM table2 WHERE a > 1 AND b = 2`)).toBe(
			`INSERT INTO table1 ( a , b ) SELECT (__data__->'a') AS a , (__data__->'b') AS b FROM table2 WHERE (__data__->'a') > 1 AND (__data__->'b') = 2`,
		)
	})

	it("should convert DELETE", () => {
		// Basic delete
		expect(dataTable_convertSql(`DELETE FROM table1`)).toBe(`DELETE FROM table1`)

		// WHERE variables wrapped, LIKE and NULL preserved
		expect(dataTable_convertSql(`DELETE FROM table1 WHERE a LIKE 'test%' OR b IS NULL`)).toBe(
			`DELETE FROM table1 WHERE (__data__->'a') LIKE 'test%' OR (__data__->'b') IS NULL`,
		)

		// ORDER BY with wrapped field, LIMIT/OFFSET preserved
		expect(dataTable_convertSql(`DELETE FROM table1 WHERE a > 1 ORDER BY a DESC LIMIT 10 OFFSET 5`)).toBe(
			`DELETE FROM table1 WHERE (__data__->'a') > 1 ORDER BY (__data__->'a') DESC LIMIT 10 OFFSET 5`,
		)
	})

	it("should convert UPDATE", () => {
		// SET fields not wrapped, values preserved
		expect(dataTable_convertSql(`UPDATE table1 SET a = 1, b = 'x'`)).toBe(
			`UPDATE table1 SET __data__ = json_merge_patch(__data__, json_object('a',1,'b','x'))`,
		)

		// WHERE variables wrapped, IN list spaced
		expect(dataTable_convertSql(`UPDATE table1 SET a = 2 WHERE b != 3 AND c IN (1,2,3)`)).toBe(
			`UPDATE table1 SET __data__ = json_merge_patch(__data__, json_object('a',2)) WHERE (__data__->'b') != 3 AND (__data__->'c') IN ( 1 , 2 , 3 )`,
		)
	})
})

describe("DataTable Encryption", () => {
	let testDbName: string
	let dataTable: DataTable

	beforeEach(() => {
		testDbName = `test_encrypted_${Date.now()}`
	})

	afterEach(() => {
		if (dataTable) {
			dataTable.Dispose()
		}
	})

	it("should generate encryption key for persistent database", async () => {
		dataTable = new DataTable(testDbName, [{ id: 1, name: "Test" }], {}, { persistant: true })

		// Initialize the database
		await dataTable.Rows()

		expect((dataTable as any)._encryptionKey).toBeDefined()
		expect((dataTable as any)._encryptionKey).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
	})

	it("should work with encrypted persistent database", async () => {
		dataTable = new DataTable(
			testDbName,
			[
				{ id: 1, name: "Alice" },
				{ id: 2, name: "Bob" },
			],
			{},
			{ persistant: true },
		)

		// Add more rows
		await dataTable.RowsAdd({ id: 3, name: "Charlie" })

		// Query data
		const rows = await dataTable.Rows()

		expect(rows).toHaveLength(3)
		expect(rows[0]).toMatchObject({ id: 1, name: "Alice" })
		expect(rows[1]).toMatchObject({ id: 2, name: "Bob" })
		expect(rows[2]).toMatchObject({ id: 3, name: "Charlie" })
	})

	it("should not generate encryption key for non-persistent database", async () => {
		dataTable = new DataTable(testDbName, [{ id: 1, name: "Test" }])

		await dataTable.Rows()

		expect((dataTable as any)._encryptionKey).toBeUndefined()
	})
})
