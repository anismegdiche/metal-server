import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigManager } from "../ConfigManager"
import { ServerEndpoint } from "../ServerEndpoint"

vi.mock("express", () => {
	const mockApp = {
		use: vi.fn(),
		get: vi.fn(),
		listen: vi.fn().mockReturnValue({
			on: vi.fn().mockReturnThis(),
		}),
	}
	const mockRoute = {
		get: vi.fn().mockReturnThis(),
		post: vi.fn().mockReturnThis(),
		put: vi.fn().mockReturnThis(),
		patch: vi.fn().mockReturnThis(),
		delete: vi.fn().mockReturnThis(),
		all: vi.fn().mockReturnThis(),
	}
	const mockRouter = {
		use: vi.fn().mockReturnThis(),
		get: vi.fn().mockReturnThis(),
		post: vi.fn().mockReturnThis(),
		route: vi.fn().mockReturnValue(mockRoute),
	}
	const express: any = vi.fn(() => mockApp)
	express.json = vi.fn(() => (_req: any, _res: any, next: any) => next())
	express.Router = vi.fn(() => mockRouter)
	return {
		default: express,
		Router: express.Router,
		json: express.json,
	}
})

vi.mock("helmet", () => ({ default: () => (_req: any, _res: any, next: any) => next() }))
vi.mock("express-rate-limit", () => ({ default: () => (_req: any, _res: any, next: any) => next() }))
vi.mock("response-time", () => ({ default: () => (_req: any, _res: any, next: any) => next() }))

vi.mock("../ConfigManager")
vi.mock("../../cache/Cache")
vi.mock("../../../utils/Swagger", () => ({
	Swagger: {
		Load: vi.fn().mockResolvedValue(undefined),
		StartUi: vi.fn(),
		Validator: vi.fn(),
	},
}))

describe("ServerEndpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
			if (key === "server.port") return 3000
			if (key === "server.response-rate") return {}
			if (key === "server.request-limit") return "10mb"
			if (key === "server.authentication") return true
			return undefined
		})
	})

	describe("InitApi", () => {
		it("should initialize express app with middlewares and routes", () => {
			ServerEndpoint.InitApi()
			expect(ServerEndpoint.Api.use).toHaveBeenCalled()
			expect(ServerEndpoint.Api.get).toHaveBeenCalledWith("/", expect.any(Function))
		})
	})

	describe("Start", () => {
		it("should start listening on configured port", () => {
			ServerEndpoint.Port = 3000
			ServerEndpoint.Start()
			expect(ServerEndpoint.Api.listen).toHaveBeenCalledWith(3000, expect.any(Function))
		})
	})
})
