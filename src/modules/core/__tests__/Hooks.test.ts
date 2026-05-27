import { beforeEach, describe, expect, it, vi } from "vitest"
import { ServerEndpoint } from "../ServerEndpoint"

vi.mock("../../auth/AuthProvider")
vi.mock("../../auth/Roles")
vi.mock("../../schema/Schema")
vi.mock("../../schema/routes/SchemaRouter", () => ({ SchemaRouter: vi.fn() }))
vi.mock("../../plan/PlansManager")
vi.mock("../../plan/Schedule")
vi.mock("../../plan/routes/PlanRouter", () => ({ PlanRouter: vi.fn() }))
vi.mock("../../plan/routes/ScheduleRouter", () => ({ ScheduleRouter: vi.fn() }))
vi.mock("../../cache/Cache", () => ({ Cache: { IsEnabled: true } }))
vi.mock("../../cache/routes/CacheRouter", () => ({ CacheRouter: vi.fn() }))
vi.mock("../ConfigManager")
vi.mock("../ServerEndpoint")
vi.mock("../ResponseHandler", () => ({ ResponseHandler: { SetContentJson: vi.fn() } }))
vi.mock("../routes/UserRouter", () => ({ UserRouter: vi.fn() }))

describe("Module Hooks", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("Auth Hook", () => {
		it("should register user routes via ServerEndpoint.RegisterMiddleware", async () => {
			const { RegisterMiddleware } = await import("../../auth/_hook")
			RegisterMiddleware()
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledTimes(1)
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledWith(expect.any(Function))
		})
	})

	describe("Schema Hook", () => {
		it("should register schema routes via ServerEndpoint.RegisterMiddleware", async () => {
			const { RegisterMiddleware } = await import("../../schema/_hook")
			RegisterMiddleware()
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledTimes(1)
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledWith(expect.any(Function))
		})
	})

	describe("Plan Hook", () => {
		it("should register plan and schedule routes via ServerEndpoint.RegisterMiddleware", async () => {
			const { RegisterMiddleware } = await import("../../plan/_hook")
			RegisterMiddleware()
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledTimes(2)
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledWith(expect.any(Function))
		})
	})

	describe("Cache Hook", () => {
		it("should register cache routes via ServerEndpoint.RegisterMiddleware", async () => {
			const { RegisterMiddleware } = await import("../../cache/_hook")
			RegisterMiddleware()
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledTimes(1)
			expect(ServerEndpoint.RegisterMiddleware).toHaveBeenCalledWith(expect.any(Function))
		})
	})
})
