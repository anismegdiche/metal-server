//

import { DataTable } from "../../types/DataTable"
import { REMOVE_DUPLICATES_METHOD, REMOVE_DUPLICATES_STRATEGY } from "../../utils/DataTableUtils"
import { DataTableUtils } from "../DataTableUtils"

describe("DataTableUtils", () => {
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
	})

	describe("PrefixAllFields", () => {
		it("should prefix all field names with the given string", async () => {
			const result = await DataTableUtils.PrefixAllFields(dt, "prefix")
			expect(result.Fields).toEqual({
				"prefix.name": "string",
				"prefix.age": "number",
			})
			expect(await result.Rows()).toEqual([
				{
					"prefix.name": "Alice",
					"prefix.age": 25,
				},
				{
					"prefix.name": "Bob",
					"prefix.age": 30,
				},
			])
		})

		it("should not modify the table if it has no rows", async () => {
			const emptyTable = new DataTable("empty")
			const result = await DataTableUtils.PrefixAllFields(emptyTable, "prefix")
			expect(result.Fields).toEqual({})
			expect(await result.Rows()).toEqual([])
		})
	})

	describe("UnPrefixAllfields", () => {
		it("should remove prefix from field names in all rows", async () => {
			// Arrange
			const data = new DataTable("TestTable", [
				{
					"prefix.Col1": "Value1",
					"prefix.Col2": "Value2",
				},
				{
					"prefix.Col1": "Value3",
					"prefix.Col2": "Value4",
				},
			])

			// Act
			const dtResult = await DataTableUtils.UnPrefixAllfields(data)

			// Assert
			const result = await dtResult.Rows()
			expect(result).toEqual([
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
		})

		it("should not modify field names if they don't have a prefix", async () => {
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

			// Act
			const dtResult = await DataTableUtils.UnPrefixAllfields(data)

			// Assert
			expect(dtResult.Fields).toEqual({
				Col1: "string",
				Col2: "string",
			})
			expect(await dtResult.Rows()).toEqual([
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

		it("should do nothing if there are no rows", async () => {
			// Arrange
			const data = new DataTable("TestTable")

			// Act
			const result = await DataTableUtils.UnPrefixAllfields(data)

			// Assert
			expect(result.Fields).toEqual({})
			expect(await result.Rows()).toEqual([])
		})
	})

	describe("Join Operations", () => {
		// Set up test tables for all join operations
		let tableA: DataTable
		let tableB: DataTable
		let emptyTable: DataTable

		beforeEach(async () => {
			// Table A: Employee data
			tableA = new DataTable("employees")
			await tableA.RowsSet([
				{ emp_id: 1, name: "Alice", dept_id: 101 },
				{ emp_id: 2, name: "Bob", dept_id: 102 },
				{ emp_id: 3, name: "Charlie", dept_id: 101 },
				{ emp_id: 4, name: "David", dept_id: null },
			])

			// Table B: Department data
			tableB = new DataTable("departments")
			await tableB.RowsSet([
				{ dept_id: 101, dept_name: "HR", location: "NY" },
				{ dept_id: 102, dept_name: "IT", location: "SF" },
				{ dept_id: 103, dept_name: "Finance", location: "CHI" },
			])

			// Empty table for edge cases
			emptyTable = new DataTable("empty")
			await emptyTable.RowsSet([])
		})

		describe("InnerJoin", () => {
			it("should perform basic inner join correctly", async () => {
				const dtResult = await DataTableUtils.InnerJoin(tableA, tableB, "dept_id", "dept_id")
				const result = await dtResult.Rows()
				expect(result).toEqual([
					{ emp_id: 1, name: "Alice", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 2, name: "Bob", dept_id: 102, dept_name: "IT", location: "SF" },
					{ emp_id: 3, name: "Charlie", dept_id: 101, dept_name: "HR", location: "NY" },
				])
			})  

			it("should return empty result when no matches found", async () => {
				const noMatchTable = new DataTable("no_match")
				await noMatchTable.RowsSet([{ dept_id: 999, name: "No Match" }])
				const result = await DataTableUtils.InnerJoin(noMatchTable, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([])
			})

			it("should handle empty table correctly", async () => {
				const result = await DataTableUtils.InnerJoin(emptyTable, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([])
			})
		})

		describe("LeftJoin", () => {
			it("should preserve all records from left table", async () => {
				const result = await DataTableUtils.LeftJoin(tableA, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ emp_id: 1, name: "Alice", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 2, name: "Bob", dept_id: 102, dept_name: "IT", location: "SF" },
					{ emp_id: 3, name: "Charlie", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 4, name: "David", dept_id: null },
				])
			})

			it("should handle left table with no matches", async () => {
				const noMatchTable = new DataTable("no_match")
				await noMatchTable.RowsSet([{ dept_id: 999, name: "No Match" }])
				const result = await DataTableUtils.LeftJoin(noMatchTable, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([{ dept_id: 999, name: "No Match" }])
			})

			it("should handle empty right table", async () => {
				const result = await DataTableUtils.LeftJoin(tableA, emptyTable, "dept_id", "dept_id")
				const original = await tableA.Rows()
				expect(await result.Rows()).toEqual(original)
			})
		})

		describe("RightJoin", () => {
			it("should preserve all records from right table", async () => {
				const result = await DataTableUtils.RightJoin(tableA, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ emp_id: 3, name: "Charlie", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 1, name: "Alice", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 2, name: "Bob", dept_id: 102, dept_name: "IT", location: "SF" },
					{ dept_id: 103, dept_name: "Finance", location: "CHI" },
				])
			})

			it("should handle right table with no matches", async () => {
				const noMatchTable = new DataTable("no_match")
				await noMatchTable.RowsSet([{ dept_id: 999, dept_name: "No Match Dept" }])
				const result = await DataTableUtils.RightJoin(tableA, noMatchTable, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([{ dept_id: 999, dept_name: "No Match Dept" }])
			})

			it("should handle empty left table", async () => {
				const result = await DataTableUtils.RightJoin(emptyTable, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ dept_id: 101, dept_name: "HR", location: "NY" },
					{ dept_id: 102, dept_name: "IT", location: "SF" },
					{ dept_id: 103, dept_name: "Finance", location: "CHI" },
				])
			})
		})

		describe("FullOuterJoin", () => {
			it("should include all records from both tables", async () => {
				const result = await DataTableUtils.FullOuterJoin(tableA, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ emp_id: 1, name: "Alice", dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 2, name: "Bob", dept_id: 102, dept_name: "IT", location: "SF" },
					{ emp_id: 3, name: "Charlie", dept_id: 101, dept_name: "HR", location: "NY" },
					{ dept_id: 103, dept_name: "Finance", location: "CHI" },
					{ emp_id: 4, name: "David", dept_id: null },
				])
			})

			it("should handle no matching records", async () => {
				const tableC = new DataTable("no_matches")
				await tableC.RowsSet([
					{ emp_id: 1, dept_id: 999, name: "No Match 1" },
					{ emp_id: 2, dept_id: 998, name: "No Match 2" },
				])

				const result = await DataTableUtils.FullOuterJoin(tableC, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ dept_id: 101, dept_name: "HR", location: "NY" },
					{ emp_id: 1, dept_id: 999, name: "No Match 1" },
					{ dept_id: 102, dept_name: "IT", location: "SF" },
					{ emp_id: 2, dept_id: 998, name: "No Match 2" },
					{ dept_id: 103, dept_name: "Finance", location: "CHI" },
				])
			})

			it("should handle empty tables", async () => {
				const result = await DataTableUtils.FullOuterJoin(emptyTable, tableB, "dept_id", "dept_id")
				expect(await result.Rows()).toEqual([
					{ dept_id: 101, dept_name: "HR", location: "NY" },
					{ dept_id: 102, dept_name: "IT", location: "SF" },
					{ dept_id: 103, dept_name: "Finance", location: "CHI" },
				])
			})
		})

		describe("CrossJoin", () => {
			it("should perform cartesian product of two tables", async () => {
				const smallA = new DataTable("small_a")
				const smallB = new DataTable("small_b")

				await smallA.RowsSet([
					{ id: 1, letter: "A" },
					{ id: 2, letter: "B" },
				])

				await smallB.RowsSet([
					{ num: 1, value: "X" },
					{ num: 2, value: "Y" },
				])

				const result = await DataTableUtils.CrossJoin(smallA, smallB)
				const rows = await result.Rows()
				expect(rows.length).toBe(4) // 2 x 2 = 4 rows
				expect(rows).toEqual([
					{ id: 1, letter: "A", num: 1, value: "X" },
					{ id: 2, letter: "B", num: 1, value: "X" },
					{ id: 1, letter: "A", num: 2, value: "Y" },
					{ id: 2, letter: "B", num: 2, value: "Y" },
				])
			})

			it("should handle empty table on either side", async () => {
				const result = await DataTableUtils.CrossJoin(tableA, emptyTable)
				expect(await result.Rows()).toEqual([])

				const result2 = await DataTableUtils.CrossJoin(emptyTable, tableB)
				expect(await result2.Rows()).toEqual([])
			})

			it("should preserve column names from both tables", async () => {
				const tableC = new DataTable("column_test")
				await tableC.RowsSet([{ unique_col: "test" }])
				const result = await DataTableUtils.CrossJoin(tableC, tableB)
				const rows = await result.Rows()
				expect(rows[0]).toHaveProperty("unique_col")
				expect(rows[0]).toHaveProperty("dept_id")
				expect(rows[0]).toHaveProperty("dept_name")
			})
		})
	})

	describe("SyncReport", () => {
		it("should return an empty TSyncReport object when DataTables have matching rows", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [],
				DeletedRows: [],
				UpdatedRows: [],
			})
		})

		it("should consider undefined or empty table as ready to add all rows from destination", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", undefined)

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [
					{
						id: 1,
						name: "John",
					},
					{
						id: 2,
						name: "Jane",
					},
					{
						id: 3,
						name: "Bob",
					},
				],
				DeletedRows: [],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with identical rows, when calling SyncReport with a common 'on' field, then it should return an empty TSyncReport object
		it("should return an empty TSyncReport object when DataTables have matching rows", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [],
				DeletedRows: [],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with no matching rows, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with all rows marked as added
		it("should return a TSyncReport object with all rows marked as added when DataTables have no matching rows", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 4,
					name: "Alice",
				},
				{
					id: 5,
					name: "Eve",
				},
				{
					id: 6,
					name: "Charlie",
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [
					{
						id: 1,
						name: "John",
					},
					{
						id: 2,
						name: "Jane",
					},
					{
						id: 3,
						name: "Bob",
					},
				],
				DeletedRows: [
					{
						id: 4,
						name: "Alice",
					},
					{
						id: 5,
						name: "Eve",
					},
					{
						id: 6,
						name: "Charlie",
					},
				],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with identical rows and additional rows in the destination DataTable, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with deleted rows only
		it("should return a TSyncReport object with deleted rows only when DataTables have additional rows in the destination DataTable", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
				{
					id: 4,
					name: "Alice",
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [],
				DeletedRows: [
					{
						id: 4,
						name: "Alice",
					},
				],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with identical rows and additional rows in the source DataTable, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with added rows only
		it("should return a TSyncReport object with added rows only when DataTables have additional rows in the source DataTable", async () => {
			// Arrange
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
				{
					id: 4,
					name: "Alice",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			// Act
			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			// Assert
			expect(syncReport).toEqual({
				AddedRows: [
					{
						id: 4,
						name: "Alice",
					},
				],
				DeletedRows: [],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with different rows, when calling SyncReport with a common 'on' field, then it should return a TSyncReport object with added, deleted and updated rows
		it("should return an empty TSyncReport object when DataTables have matching rows", async () => {
			const sourceData = new DataTable("Source", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "id",
			})

			expect(syncReport).toEqual({
				AddedRows: [],
				DeletedRows: [],
				UpdatedRows: [],
			})
		})

		// Given two DataTables with different field names, when calling SyncReport with a common 'on' field, then it should throw an error
		it("should throw an error when calling SyncReport with DataTables with different field names", async () => {
			const sourceData = new DataTable("Source")
			await sourceData.RowsSet([
				{
					id: 1,
					name: "John",
				},
				{
					id: 2,
					name: "Jane",
				},
				{
					id: 3,
					name: "Bob",
				},
			])

			const destinationData = new DataTable("Destination")
			await destinationData.RowsSet([
				{
					identifier: 1,
					fullName: "John Doe",
				},
				{
					identifier: 2,
					fullName: "Jane Smith",
				},
				{
					identifier: 3,
					fullName: "Bob Johnson",
				},
			])

			await expect(
				DataTableUtils.SyncReport({
					source: sourceData,
					destination: destinationData,
					on: "identifier",
				}),
			).rejects.toThrow()
		})

		it("Case: Sync from Memory to Postgres", async () => {
			const sourceData = new DataTable("Source", [
				{
					memid: 0,
					surname: "GUEST",
					firstname: "GUEST",
					address: "XXXXXXXXXX",
					zipcode: 0,
					telephone: "(000) 000-0000",
					recommendedby: null,
					joindate: new Date("2012-06-30T22:00:00.000Z"),
				},
				{
					memid: 1,
					surname: "Smith",
					firstname: "Darren",
					address: "XXXXXXXXXX",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:02:05.000Z"),
				},
				{
					memid: 2,
					surname: "Smith",
					firstname: "Tracy",
					address: "XXXXXXXXXX",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:08:23.000Z"),
				},
				{
					memid: 3,
					surname: "Rownam",
					firstname: "Tim",
					address: "XXXXXXXXXX",
					zipcode: 23423,
					telephone: "(844) 693-0723",
					recommendedby: null,
					joindate: new Date("2012-07-03T07:32:15.000Z"),
				},
				{
					memid: 4,
					surname: "Joplette",
					firstname: "Janice",
					address: "20 Crossing Road, New York",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
				{
					memid: 6,
					surname: "toadd",
					firstname: "ADD",
					address: "where",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					memid: 0,
					surname: "GUEST",
					firstname: "GUEST",
					address: "GUEST",
					zipcode: 0,
					telephone: "(000) 000-0000",
					recommendedby: null,
					joindate: new Date("2012-06-30T22:00:00.000Z"),
				},
				{
					memid: 1,
					surname: "Smith",
					firstname: "Darren",
					address: "8 Bloomsbury Close, Boston",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:02:05.000Z"),
				},
				{
					memid: 2,
					surname: "Smith",
					firstname: "Tracy",
					address: "8 Bloomsbury Close, New York",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:08:23.000Z"),
				},
				{
					memid: 3,
					surname: "Rownam",
					firstname: "Tim",
					address: "23 Highway Way, Boston",
					zipcode: 23423,
					telephone: "(844) 693-0723",
					recommendedby: null,
					joindate: new Date("2012-07-03T07:32:15.000Z"),
				},
				{
					memid: 4,
					surname: "Joplette",
					firstname: "Janice",
					address: "20 Crossing Road, New York",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
				{
					memid: 5,
					surname: "todelete",
					firstname: "DELETE",
					address: "nowhere",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "memid",
			})

			expect(syncReport).toEqual({
				AddedRows: [
					{
						memid: 6,
						surname: "toadd",
						firstname: "ADD",
						address: "where",
						zipcode: 234,
						telephone: "(833) 942-4710",
						recommendedby: 1,
						joindate: new Date("2012-07-03T08:25:05.000Z"),
					},
				],
				DeletedRows: [
					{
						memid: 5,
						surname: "todelete",
						firstname: "DELETE",
						address: "nowhere",
						zipcode: 234,
						telephone: "(833) 942-4710",
						recommendedby: 1,
						joindate: new Date("2012-07-03T08:25:05.000Z"),
					},
				],
				UpdatedRows: [
					{
						memid: 0,
						surname: "GUEST",
						firstname: "GUEST",
						address: "XXXXXXXXXX",
						zipcode: 0,
						telephone: "(000) 000-0000",
						recommendedby: null,
						joindate: new Date("2012-06-30T22:00:00.000Z"),
					},
					{
						memid: 1,
						surname: "Smith",
						firstname: "Darren",
						address: "XXXXXXXXXX",
						zipcode: 4321,
						telephone: "555-555-5555",
						recommendedby: null,
						joindate: new Date("2012-07-02T10:02:05.000Z"),
					},
					{
						memid: 2,
						surname: "Smith",
						firstname: "Tracy",
						address: "XXXXXXXXXX",
						zipcode: 4321,
						telephone: "555-555-5555",
						recommendedby: null,
						joindate: new Date("2012-07-02T10:08:23.000Z"),
					},
					{
						memid: 3,
						surname: "Rownam",
						firstname: "Tim",
						address: "XXXXXXXXXX",
						zipcode: 23423,
						telephone: "(844) 693-0723",
						recommendedby: null,
						joindate: new Date("2012-07-03T07:32:15.000Z"),
					},
				],
			})
		})

		it("Case: Sync from Memory to Postgres (Optimized return)", async () => {
			const sourceData = new DataTable("Source", [
				{
					memid: 0,
					surname: "GUEST",
					firstname: "GUEST",
					address: "XXXXXXXXXX",
					zipcode: 0,
					telephone: "(000) 000-0000",
					recommendedby: null,
					joindate: new Date("2012-06-30T22:00:00.000Z"),
				},
				{
					memid: 1,
					surname: "Smith",
					firstname: "Darren",
					address: "XXXXXXXXXX",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:02:05.000Z"),
				},
				{
					memid: 2,
					surname: "Smith",
					firstname: "Tracy",
					address: "XXXXXXXXXX",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:08:23.000Z"),
				},
				{
					memid: 3,
					surname: "Rownam",
					firstname: "Tim",
					address: "XXXXXXXXXX",
					zipcode: 23423,
					telephone: "(844) 693-0723",
					recommendedby: null,
					joindate: new Date("2012-07-03T07:32:15.000Z"),
				},
				{
					memid: 4,
					surname: "Joplette",
					firstname: "Janice",
					address: "20 Crossing Road, New York",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
				{
					memid: 6,
					surname: "toadd",
					firstname: "ADD",
					address: "where",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
			])

			const destinationData = new DataTable("Destination", [
				{
					memid: 0,
					surname: "GUEST",
					firstname: "GUEST",
					address: "GUEST",
					zipcode: 0,
					telephone: "(000) 000-0000",
					recommendedby: null,
					joindate: new Date("2012-06-30T22:00:00.000Z"),
				},
				{
					memid: 1,
					surname: "Smith",
					firstname: "Darren",
					address: "8 Bloomsbury Close, Boston",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:02:05.000Z"),
				},
				{
					memid: 2,
					surname: "Smith",
					firstname: "Tracy",
					address: "8 Bloomsbury Close, New York",
					zipcode: 4321,
					telephone: "555-555-5555",
					recommendedby: null,
					joindate: new Date("2012-07-02T10:08:23.000Z"),
				},
				{
					memid: 3,
					surname: "Rownam",
					firstname: "Tim",
					address: "23 Highway Way, Boston",
					zipcode: 23423,
					telephone: "(844) 693-0723",
					recommendedby: null,
					joindate: new Date("2012-07-03T07:32:15.000Z"),
				},
				{
					memid: 4,
					surname: "Joplette",
					firstname: "Janice",
					address: "20 Crossing Road, New York",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
				{
					memid: 5,
					surname: "todelete",
					firstname: "DELETE",
					address: "nowhere",
					zipcode: 234,
					telephone: "(833) 942-4710",
					recommendedby: 1,
					joindate: new Date("2012-07-03T08:25:05.000Z"),
				},
			])

			const syncReport = await DataTableUtils.SyncReport({
				source: sourceData,
				destination: destinationData,
				on: "memid",
			})

			expect(syncReport).toEqual({
				AddedRows: [
					{
						memid: 6,
						surname: "toadd",
						firstname: "ADD",
						address: "where",
						zipcode: 234,
						telephone: "(833) 942-4710",
						recommendedby: 1,
						joindate: new Date("2012-07-03T08:25:05.000Z"),
					},
				],
				DeletedRows: [
					{
						memid: 5,
						surname: "todelete",
						firstname: "DELETE",
						address: "nowhere",
						zipcode: 234,
						telephone: "(833) 942-4710",
						recommendedby: 1,
						joindate: new Date("2012-07-03T08:25:05.000Z"),
					},
				],
				UpdatedRows: [
					{
						memid: 0,
						surname: "GUEST",
						firstname: "GUEST",
						address: "XXXXXXXXXX",
						zipcode: 0,
						telephone: "(000) 000-0000",
						recommendedby: null,
						joindate: new Date("2012-06-30T22:00:00.000Z"),
					},
					{
						memid: 1,
						surname: "Smith",
						firstname: "Darren",
						address: "XXXXXXXXXX",
						zipcode: 4321,
						telephone: "555-555-5555",
						recommendedby: null,
						joindate: new Date("2012-07-02T10:02:05.000Z"),
					},
					{
						memid: 2,
						surname: "Smith",
						firstname: "Tracy",
						address: "XXXXXXXXXX",
						zipcode: 4321,
						telephone: "555-555-5555",
						recommendedby: null,
						joindate: new Date("2012-07-02T10:08:23.000Z"),
					},
					{
						memid: 3,
						surname: "Rownam",
						firstname: "Tim",
						address: "XXXXXXXXXX",
						zipcode: 23423,
						telephone: "(844) 693-0723",
						recommendedby: null,
						joindate: new Date("2012-07-03T07:32:15.000Z"),
					},
				],
			})
		})
	})

	describe("Anonymize", () => {
		// Anonymizes specified fields in all rows
		it("should anonymize specified fields in all rows", async () => {
			const dataTable = new DataTable("myTable", [
				{
					name: "John Doe",
					email: "john@example.com",
				},
				{
					name: "Jane Doe",
					email: "jane@example.com",
				},
			])
			const fieldsToAnonymize = ["email"]
			await DataTableUtils.Anonymize(dataTable, fieldsToAnonymize)
			const rows = await dataTable.Rows()
			rows.forEach((row) => {
				expect(row.email).toMatch(/^[A-Za-z0-9+/]*={0,2}$/)
			})
		})

		// Anonymizes fields when no rows are present
		it("should handle anonymization when no rows are present", async () => {
			const dataTable = new DataTable("myTable")
			await dataTable.RowsSet([])
			const fieldsToAnonymize = ["email"]
			const result = await DataTableUtils.Anonymize(dataTable, fieldsToAnonymize)
			expect(await result.Rows()).toEqual([])
		})

		// Returns the DataTable instance after anonymization
		it("should return DataTable instance after anonymization when fields are provided", async () => {
			const dataTable = new DataTable("myTable")
			const fields = ["email", "phone"]
			const result = await DataTableUtils.Anonymize(dataTable, fields)
			expect(result).toBeInstanceOf(DataTable)
		})

		// Handles multiple fields for anonymization
		it("should anonymize specified fields for all rows when multiple fields are provided", async () => {
			const dataTable = new DataTable("myTable", [
				{
					name: "Alice",
					email: "alice@example.com",
				},
				{
					name: "Bob",
					email: "bob@example.com",
				},
			])
			const fields = ["name", "email"]
			const result = await DataTableUtils.Anonymize(dataTable, fields)
			expect((await result.Rows())[0]?.name).not.toBe("Alice")
			expect((await result.Rows())[0]?.email).not.toBe("alice@example.com")
			expect((await result.Rows())[1]?.name).not.toBe("Bob")
			expect((await result.Rows())[1]?.email).not.toBe("bob@example.com")
		})

		// Processes all rows in the DataTable
		it("should anonymize specified fields for all rows when processing all rows", async () => {
			const dataTable = new DataTable("myTable")
			await dataTable.RowsSet([
				{
					name: "Alice",
					email: "alice@example.com",
				},
				{
					name: "Bob",
					email: "bob@example.com",
				},
			])
			const fields = ["name", "email"]
			const result = await DataTableUtils.Anonymize(dataTable, fields)
			expect((await result.Rows())[0]?.name).not.toBe("Alice")
			expect((await result.Rows())[0]?.email).not.toBe("alice@example.com")
			expect((await result.Rows())[1]?.name).not.toBe("Bob")
			expect((await result.Rows())[1]?.email).not.toBe("bob@example.com")
		})

		// Handles empty fields array without errors
		it("should handle empty fields array without errors when calling AnonymizeFields", async () => {
			const dataTable = new DataTable("myTable")
			const rows = [
				{
					name: "Alice",
					age: 30,
				},
				{
					name: "Bob",
					age: 25,
				},
			]
			await dataTable.RowsSet(rows)
			const result = await DataTableUtils.Anonymize(dataTable, [])

			expect(await result.Rows()).toEqual(rows)
		})

		// Anonymizes fields when some rows lack the specified fields
		it("should anonymize fields when some rows lack the specified fields when calling AnonymizeFields", async () => {
			const dataTable = new DataTable("myTable")
			const rows = [
				{
					name: "Alice",
					age: 30,
				},
				{
					name: "Bob",
				},
			]

			await dataTable.RowsSet(rows)

			const expectedRows = [
				{
					name: "Alice",
					age: "F2mdKMiTK6Wq34bDP1jIKrF9dNPtu/EJu8QgFJLNIsw=",
				},
				{
					name: "Bob",
				},
			]

			const result = await DataTableUtils.Anonymize(dataTable, ["age"])

			expect(await result.Rows()).toEqual(expectedRows)
		})

		// Processes all fields in the DataTable
		it("should anonymize all fields for all rows", async () => {
			const dataTable = new DataTable("myTable")
			await dataTable.RowsSet([
				{
					name: "Alice",
					email: "alice@example.com",
				},
				{
					name: "Bob",
					email: "bob@example.com",
				},
			])
			const fields = "*"
			const result = await DataTableUtils.Anonymize(dataTable, fields)
			expect(await result.Rows()).toEqual([
				{
					email: "JKujUcPGJxgTM5IlypKLP7HKRd/8opG4tFp2wuvl644=",
					name: "lsuciPTQkJ1xx+/Pi9+xAZlgr/iAp7Cz4/+3ZHKqI4g=",
				},
				{
					email: "bcr/lBtGgyStO61XSOcHUAPI5dNFXLgyRUSMewrYUs8=",
					name: "RMcdMMmopXifCoQPDlxg6rTQUXyqDhbAckNcEGqla3M=",
				},
			])
		})
	})

	describe("RemoveDuplicates", () => {
		const dtDuplicates = new DataTable("mytable")

		beforeEach(async () => {
			await dtDuplicates.RowsSet([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 1, name: "Alice", age: 15, value: null },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 2, name: "Bob", age: true, value: 15 },
				{ id: 2, name: "Bob", age: undefined, value: 15 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 3, name: "Jane", age: 25, value: undefined },
				{ id: 4 },
			])
		})

		afterEach(async () => {
			await dtDuplicates.RowsSet([])
		})

		// Removes duplicate rows based on specified fields using hash method
		it("should remove duplicate rows based on specified fields using hash method", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id", "name"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
			)
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles empty rows array gracefully
		it("should handle empty rows array gracefully", async () => {
			await dtDuplicates.RowsSet([])
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["name", "age"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
				"",
			)
			expect(await result.Rows()).toEqual([])
		})

		it("should remove duplicate rows based on specified fields using exact method", async () => {
			// Call the method
			const result = await DataTableUtils.RemoveDuplicates(dtDuplicates, ["id", "name"], REMOVE_DUPLICATES_METHOD.EXACT)

			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Keeps the first occurrence of duplicate rows when strategy is REMOVE_DUPLICATES_STRATEGY.FIRST
		it("should keep the last occurrence of duplicate rows when strategy is last", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id", "name"],
				REMOVE_DUPLICATES_METHOD.EXACT,
				REMOVE_DUPLICATES_STRATEGY.LAST,
			)

			const rows = await result.Rows()

			// Assertion
			expect(rows).toEqual([
				{ id: 1, name: "Alice", age: 15, value: null },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: undefined, value: 15 },
				{ id: 3, name: "Jane", age: 25, value: undefined },
				{ id: 4 },
			])
		})

		// Replaces the first occurrence with the last occurrence when strategy is 'last'
		it("should replace first occurrence with last occurrence when strategy is last", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.LAST,
			)

			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: undefined, value: 15 },
				{ id: 3, name: "Jane", age: 25, value: undefined },
				{ id: 4 },
			])
		})

		// Replaces the first occurrence with the row having maximum condition value when strategy is 'highest'
		it("should replace first occurrence with row having maximum condition value when strategy is max", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.HIGHEST,
				"value",
			)

			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Replaces the first occurrence with the row having minimum condition value when strategy is 'lowest'
		it("should replace first occurrence with row having minimum condition value when strategy is min", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["name"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.LOWEST,
				"age",
			)

			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 15, value: null },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: true, value: 15 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles empty fields array gracefully
		it("should handle empty fields array gracefully when calling RemoveDuplicates", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				[],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
			)

			// Assert that Rows remain unchanged
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 1, name: "Alice", age: 15, value: null },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 2, name: "Bob", age: true, value: 15 },
				{ id: 2, name: "Bob", age: undefined, value: 15 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 3, name: "Jane", age: 25, value: undefined },
				{ id: 4 },
			])
		})

		// Handles invalid JSON structure in rows
		it("should handle invalid JSON structure in rows when calling RemoveDuplicates", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
				"",
			)

			// Assert that Rows remain unchanged
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles invalid condition path in rows
		it("should handle invalid condition path in rows when calling RemoveDuplicates", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
				"invalidField",
			)
			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles rows with missing fields specified in the fields array
		it("should handle rows with missing fields specified in the fields array when calling RemoveDuplicates", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id", "name"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
			)

			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 1, name: "alice", age: 30 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles rows with null or undefined values in specified fields
		it("should handle rows with null or undefined values in specified fields when calling RemoveDuplicates method", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.FIRST,
			)
			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		// Handles rows with non-string values in specified fields
		it("should handle rows with non-string values in specified fields when calling RemoveDuplicates method and condition", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id"],
				REMOVE_DUPLICATES_METHOD.HASH,
				REMOVE_DUPLICATES_STRATEGY.HIGHEST,
				"age",
			)
			// Assertion
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 25, value: undefined },
				{ id: 4 },
			])
		})

		it("should remove duplicate rows based on specified fields using ignorecase method", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id", "name"],
				REMOVE_DUPLICATES_METHOD.IGNORE_CASE,
				REMOVE_DUPLICATES_STRATEGY.LOWEST,
				"age",
			)
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 15, value: null },
				{ id: 2, name: "Bob", age: true, value: 15 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
		})

		it("should remove duplicate rows based on custom strategy", async () => {
			const result = await DataTableUtils.RemoveDuplicates(
				dtDuplicates,
				["id", "name"],
				REMOVE_DUPLICATES_METHOD.IGNORE_CASE,
				REMOVE_DUPLICATES_STRATEGY.CUSTOM,
				"age > 10 AND value > 0",
			)
			expect(await result.Rows()).toEqual([
				{ id: 1, name: "Alice", age: 30, value: 10 },
				{ id: 2, name: "Bob", age: 25, value: 20 },
				{ id: 3, name: "Jane", age: 10, value: true },
				{ id: 4 },
			])
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

	describe("SetFromDataTable", () => {
		it("should copy all data from source to target using DuckDB COPY", async () => {
			const source = new DataTable("source")
			await source.RowsSet([
				{ id: 1, name: "Alice", value: 100 },
				{ id: 2, name: "Bob", value: 200 },
				{ id: 3, name: "Charlie", value: 300 },
			])

			const target = new DataTable("target")

			await DataTableUtils.SetFromDataTable(target, source)

			const targetRows = await target.Rows()
			expect(targetRows.length).toBe(3)
			expect(targetRows).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ id: 1, name: "Alice", value: 100 }),
					expect.objectContaining({ id: 2, name: "Bob", value: 200 }),
					expect.objectContaining({ id: 3, name: "Charlie", value: 300 }),
				]),
			)

			expect(target.Fields).toEqual(source.Fields)
		})

		it("should overwrite existing data in target", async () => {
			const source = new DataTable("source")
			await source.RowsSet([{ id: 10, name: "New" }])

			const target = new DataTable("target")
			await target.RowsSet([{ id: 1, name: "Old" }])

			await DataTableUtils.SetFromDataTable(target, source)

			const targetRows = await target.Rows()
			expect(targetRows.length).toBe(1)
			expect(targetRows[0]).toEqual(expect.objectContaining({ id: 10, name: "New" }))
		})
	})
})
