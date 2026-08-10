import { AzureCosmosDbHelper } from "../providers/AzureCosmosDbHelper"

// mock related classes
vi.mock("../providers/StorageData", () => ({ StorageData: {} }))
vi.mock("../providers/MemoryData", () => ({ MemoryData: {} }))
vi.mock("../providers/WebServiceData", () => ({ WebServiceData: {} }))
vi.mock("../providers/MetalData", () => ({ MetalData: {} }))
vi.mock("../providers/MongoDbData", () => ({ MongoDbData: {} }))
vi.mock("../providers/MySqlData", () => ({ MySqlData: {} }))
vi.mock("../../plan/Step", () => ({ Step: {} }))
vi.mock("../providers/PlanData", () => ({ PlanData: {} }))
vi.mock("../providers/PostgresData", () => ({ PostgresData: {} }))
vi.mock("../providers/SqlServerData", () => ({ SqlServerData: {} }))
vi.mock("../providers/AzureCosmosDbData", () => ({ AzureCosmosDbData: {} }))

describe("CosmoDbHelper", () => {
	describe("ParseSqlQuery", () => {
		it("should throw error for empty SQL query", () => {
			const sqlQuery = undefined
			expect(() => AzureCosmosDbHelper.ParseSqlQuery(sqlQuery)).toThrow(/Empty SQL Query/)
		})

		it("should add c. prefix to variables without it", () => {
			const sqlQuery = "SELECT name , category FROM c WHERE name = 'test'"
			const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'"
			expect(AzureCosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected)
		})

		it("should preserve variables that already have c. prefix", () => {
			const sqlQuery = "SELECT c.name , c.category FROM c WHERE c.name = 'test'"
			const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'"
			expect(AzureCosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected)
		})

		it("should handle multiple variables in a single token", () => {
			const sqlQuery = "SELECT name , category FROM c WHERE name = 'test'"
			const expected = "SELECT c.name , c.category FROM c WHERE c.name = 'test'"
			expect(AzureCosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected)
		})

		it("should preserve SQL commands and strings", () => {
			const sqlQuery = "SELECT name FROM c WHERE name LIKE 'Mountain%'"
			const expected = "SELECT c.name FROM c WHERE c.name LIKE 'Mountain%'"
			expect(AzureCosmosDbHelper.ParseSqlQuery(sqlQuery)).toBe(expected)
		})
	})
})
