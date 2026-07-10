import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigManager } from "../../core/ConfigManager"
import { PlansManager } from "../../plan/PlansManager"
import { AI_ENGINE } from "../@consts"
import { AiDocker } from "../AiDocker"
import { AiEngine } from "../AiEngine"
import type { IAiEngine } from "../base/IAiEngine"

vi.mock("../../core/ConfigManager")
vi.mock("../AiDocker", () => ({
	AiDocker: {
		Init: vi.fn().mockResolvedValue(undefined),
		BuildServiceImage: vi.fn().mockResolvedValue(undefined),
	},
}))
vi.mock("../engine/Text", () => ({
	Text: class {
		Clone() {
			return new (this.constructor as new () => object)()
		}
		Init() {
			return Promise.resolve()
		}
	},
}))

describe("AiEngine", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Clear private static factory if possible?
		// We'll just test the logic.
	})

	describe("BuildAiEnginesList", () => {
		it("should return empty object if no plans", () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(false)
			expect(AiEngine.BuildAiEnginesList()).toEqual({})
		})

		it("should extract ai-tasks from plans", () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			PlansManager.Config = {
				p1: [[{ run: { ai: "text", task: "t1" } }]],
			} as any

			const list = AiEngine.BuildAiEnginesList()
			expect(list).toEqual({
				"text-t1": { engine: "text-t1" },
			})
		})
	})

	describe("GetProvider", () => {
		it("should load and return a provider", async () => {
			const provider = await AiEngine.GetProvider("text-t1")
			expect(provider).toBeDefined()
		})

		it("should throw for invalid provider name", async () => {
			await expect(AiEngine.GetProvider("invalid")).rejects.toThrow()
		})

		it("should throw for unknown engine type", async () => {
			await expect(AiEngine.GetProvider("unknown-task")).rejects.toThrow(/not found/i)
		})
	})

	describe("Init", () => {
		it("should return early without plans", async () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(false)

			await AiEngine.Init()

			expect(AiDocker.Init).not.toHaveBeenCalled()
		})

		it("should return early when no ai engines are configured", async () => {
			PlansManager.Config = {}

			await AiEngine.Init()

			expect(AiDocker.Init).not.toHaveBeenCalled()
		})

		it("should initialize docker and build images before creating providers", async () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			PlansManager.Config = {
				p1: [[{ run: { ai: AI_ENGINE.TEXT, task: "t1" } }, { run: { ai: AI_ENGINE.IMAGE, task: "t2" } }]],
			} as any
			const createAllSpy = vi.spyOn(AiEngine, "CreateAll").mockResolvedValue(undefined)

			await AiEngine.Init()

			expect(AiDocker.Init).toHaveBeenCalled()
			expect(AiDocker.BuildServiceImage).toHaveBeenCalledTimes(2)
			expect(createAllSpy).toHaveBeenCalled()
		})
	})

	describe("CreateAll", () => {
		it("should throw with aggregated errors", async () => {
			const plans = {
				p1: [[{ run: { ai: AI_ENGINE.TEXT, task: "t1" } }]],
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockImplementation((path: string) => {
				if (path === "plans") {
					return plans
				}
				return 1
			})
			vi.spyOn(AiEngine, "GetProvider").mockRejectedValue(new Error("boom"))

			const createAllSpy = vi.spyOn(AiEngine, "CreateAll").mockResolvedValue(undefined)
			await AiEngine.Init()
			createAllSpy.mockRestore()

			await expect(AiEngine.CreateAll()).rejects.toThrow()
		})

		it("should init all providers successfully", async () => {
			const plans = {
				p1: [[{ run: { ai: AI_ENGINE.TEXT, task: "t1" } }]],
			}
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockImplementation((path: string) => {
				if (path === "plans") {
					return plans
				}
				return 1
			})
			const engine = {
				AiEngineName: AI_ENGINE.TEXT,
				InstanceName: "text-t1",
				InstanceApiUrl: "http://localhost",
				InstanceConfig: null,
				AiDockerService: {},
				RunTask: {},
				Init: vi.fn().mockResolvedValue(undefined),
				Run: vi.fn(),
				IsHealthy: vi.fn(),
				Prepare: vi.fn(),
				Clone: () => ({ Init: vi.fn().mockResolvedValue(undefined) }),
			} as IAiEngine
			vi.spyOn(AiEngine, "GetProvider").mockResolvedValue(engine)

			await AiEngine.Init()

			await expect(AiEngine.CreateAll()).resolves.toBeUndefined()
		})
	})
})
