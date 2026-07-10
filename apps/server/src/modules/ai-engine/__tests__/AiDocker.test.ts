import { beforeEach, describe, expect, it, vi } from "vitest"

const mockDockerInstance = vi.hoisted(() => ({
	ping: vi.fn().mockResolvedValue(true),
	listContainers: vi.fn().mockResolvedValue([]),
	createContainer: vi.fn(),
	getContainer: vi.fn(),
	createNetwork: vi.fn().mockResolvedValue({}),
	listNetworks: vi.fn().mockResolvedValue([]),
	pull: vi.fn(),
	buildImage: vi.fn(),
	modem: {
		followProgress: vi.fn(),
	},
}))

vi.mock("dockerode", () => ({
	default: class MockDocker {
		constructor() {
			Object.assign(this, mockDockerInstance)
		}
	},
}))

vi.mock("../../core/ConfigManager")

// Import after mocking
import { ConfigManager } from "../../core/ConfigManager"
import { AiDocker } from "../AiDocker"

describe("AiDocker", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		AiDocker.docker = mockDockerInstance as any
	})

	describe("Init", () => {
		it("should initialize and call CleanStack and CreateNetwork if not in build mode", async () => {
			vi.spyOn(ConfigManager, "Get").mockReturnValue({
				"scale-interval": 1000,
				auto_scale: true,
				params: {},
			})

			const cleanStackSpy = vi.spyOn(AiDocker, "CleanStack").mockResolvedValue(undefined)
			const createNetworkSpy = vi.spyOn(AiDocker, "CreateNetwork").mockResolvedValue(undefined as any)
			const startCaddySpy = vi.spyOn(AiDocker, "StartCaddy").mockResolvedValue(undefined)
			const startScalerSpy = vi.spyOn(AiDocker, "StartScaler").mockImplementation(() => {})

			await AiDocker.Init(false)

			expect(mockDockerInstance.ping).toHaveBeenCalled()
			expect(cleanStackSpy).toHaveBeenCalled()
			expect(createNetworkSpy).toHaveBeenCalled()
			expect(startCaddySpy).toHaveBeenCalled()
			expect(startScalerSpy).toHaveBeenCalled()
		})
	})
})
