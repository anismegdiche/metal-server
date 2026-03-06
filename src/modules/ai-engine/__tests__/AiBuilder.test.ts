import { beforeEach, describe, expect, it, vi } from "vitest"
import { AiBuilder } from "../AiBuilder"
import { AiDocker } from "../AiDocker"

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
vi.mock("../AiDocker")
vi.mock("../engine/Ocr", () => ({
	Ocr: class {
		Prepare() {
			return Promise.resolve()
		}
		AiDockerService = {}
	},
}))
vi.mock("../engine/Text", () => ({
	Text: class {
		Prepare() {
			return Promise.resolve()
		}
		AiDockerService = {}
	},
}))
vi.mock("../engine/Image", () => ({
	Image: class {
		Prepare() {
			return Promise.resolve()
		}
		AiDockerService = {}
	},
}))
vi.mock("../engine/Audio", () => ({
	Audio: class {
		Prepare() {
			return Promise.resolve()
		}
		AiDockerService = {}
	},
}))

describe("AiBuilder", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("should prepare images for all engine types", async () => {
		vi.mocked(AiDocker.BuildServiceImage).mockResolvedValue(undefined as any)

		await AiBuilder.PrepareImages()

		expect(AiDocker.BuildServiceImage).toHaveBeenCalled()
	})

	it("should prepare specific ai engine", async () => {
		const mockAi = {
			Prepare: vi.fn().mockResolvedValue(undefined),
			AiDockerService: {
				s1: { Name: "service1" },
			},
		}

		await AiBuilder.PrepareAiEngines(mockAi as any)

		expect(mockAi.Prepare).toHaveBeenCalled()
		expect(AiDocker.BuildServiceImage).toHaveBeenCalledWith({ Name: "service1" })
	})
})
