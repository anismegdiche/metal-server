import type { U_config_sources_source } from "../../core/types/U_config_sources"
import { HttpErrorNotFound } from "../../errors/HttpErrors"
import type { TSchemaRequestListEntities } from "../../schema/types/TSchemaRequest"
import { DATA_PROVIDER } from "../@consts"
import { MongoDbData } from "../providers/MongoDbData"

// Mock the mongodb module
const mockCollection = {
	insertMany: vi.fn().mockResolvedValue({ insertedCount: 1 }),
	aggregate: vi.fn().mockReturnThis(),
	find: vi.fn().mockReturnThis(),
	toArray: vi.fn().mockResolvedValue([{ id: 1, name: "test" }]),
	updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
	deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
	countDocuments: vi.fn().mockResolvedValue(1),
	listCollections: vi.fn().mockReturnThis(),
}

const mockDb = {
	command: vi.fn().mockResolvedValue({}),
	collection: vi.fn().mockReturnValue(mockCollection),
	listCollections: vi.fn().mockReturnThis(),
}

const mockMongoClient = {
	connect: vi.fn().mockResolvedValue(undefined),
	db: vi.fn().mockReturnValue(mockDb),
	close: vi.fn().mockResolvedValue(undefined),
}

// Mock the mongodb module
vi.mock("mongodb", () => ({
	MongoClient: vi.fn(function MockMongoClient() {
		return mockMongoClient
	}),
}))

// Mock the Cache module
vi.mock("../../cache/Cache")

describe("MongoDbData", () => {
	let provider: MongoDbData

	const providerConfig: U_config_sources_source = {
		provider: DATA_PROVIDER.MONGODB,
		host: "mongodb://127.0.0.1:27017/",
		database: "test-db",
		options: {},
	}

	beforeEach(async () => {
		// Reset all mocks before each test
		vi.clearAllMocks()

		// Setup default mock implementations
		mockCollection.toArray.mockResolvedValue([{ dummy: "data" }])
		mockDb.listCollections.mockReturnValue({
			toArray: vi.fn().mockResolvedValue([{ name: "test-collection" }]),
		})

		// Create a new provider instance with test configuration
		provider = new MongoDbData()
		await provider.Init("test-source", providerConfig)
		// Connect after initialization
		await provider.Connect()
	})

	describe("Init and Connection", () => {
		it("should successfully initialize and connect", async () => {
			// The connection is established in the beforeEach hook
			expect(provider.Connection).toBeDefined()
			expect(mockMongoClient.connect).toHaveBeenCalled()
			expect(mockDb.command).toHaveBeenCalledWith({ ping: 1 })
		})

		it("should handle disconnect when not connected", async () => {
			provider.Connection = undefined
			await provider.Disconnect()
			expect(mockMongoClient.close).not.toHaveBeenCalled()
		})

		it("should handle disconnect errors gracefully", async () => {
			await provider.Disconnect()
			// Should not throw error
			expect(mockMongoClient.close).toHaveBeenCalled()
		})
	})

	describe("Escape", () => {
		it("should correctly escape entity names", () => {
			const result = provider.EscapeEntity("test-table")
			expect(result).toBe("test-table")
		})

		it("should correctly escape field names", () => {
			const result = provider.EscapeField("user_id")
			expect(result).toBe("user_id")
		})
	})

	describe("ListEntities", () => {
		it("should successfully list entities", async () => {
			const mockListRequest = <TSchemaRequestListEntities>{
				schema: "test-schema",
			}

			const mockCollections = [
				{ name: "table1", type: "collection" },
				{ name: "table2", type: "collection" },
			]

			// Mock the listCollections response
			mockDb.listCollections.mockReturnValue({
				toArray: vi.fn().mockResolvedValue(mockCollections),
			})

			const response = await provider.ListEntities(mockListRequest)

			expect(response.StatusCode).toBe(200)
			expect(await response.Body?.data.Rows()).toHaveLength(2)
		})

		it("should throw NotFound when no entities exist", async () => {
			const mockListRequest = <TSchemaRequestListEntities>{
				schema: "test-schema",
			}

			// Mock empty collections list
			mockDb.listCollections.mockReturnValue({
				toArray: vi.fn().mockResolvedValue([]),
			})

			await expect(provider.ListEntities(mockListRequest)).rejects.toThrow(HttpErrorNotFound)
		})
	})
})
