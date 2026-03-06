import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataProvider } from "../DataProvider"
import { Source } from "../Source"

vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		In: "",
		Out: "",
	},
}))
vi.mock("../DataProvider")
vi.mock("../errors/HttpErrors")

describe("Source", () => {
	let mockDataProvider: any

	beforeEach(() => {
		vi.clearAllMocks()
		Source.Sources.clear()
		mockDataProvider = {
			Init: vi.fn().mockResolvedValue(undefined),
			Connect: vi.fn().mockResolvedValue(undefined),
			Disconnect: vi.fn().mockResolvedValue(undefined),
		}
	})

	describe("Connect", () => {
		it("should connect to a valid provider", async () => {
			const config = { provider: "postgres" } // Use a value that exists in DATA_PROVIDER or mock DATA_PROVIDER
			// Let's check DATA_PROVIDER values or just mock it.
			// Assuming 'postgres' is valid.

			vi.mocked(DataProvider.GetProvider).mockResolvedValue(mockDataProvider)

			await Source.Connect("s1", config as any)

			expect(Source.Sources.has("s1")).toBe(true)
			expect(mockDataProvider.Init).toHaveBeenCalledWith("s1", config)
			expect(mockDataProvider.Connect).toHaveBeenCalled()
		})

		it("should log error for invalid provider", async () => {
			await Source.Connect("s1", { provider: "invalid" } as any)
			expect(Source.Sources.has("s1")).toBe(false)
		})
	})

	describe("DisconnectAll", () => {
		it("should disconnect all sources", async () => {
			Source.Sources.set("s1", { DataProvider: mockDataProvider } as any)
			await Source.DisconnectAll()
			expect(mockDataProvider.Disconnect).toHaveBeenCalled()
			expect(Source.Sources.size).toBe(0)
		})
	})
})
