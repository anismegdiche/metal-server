import { beforeEach, describe, expect, it, vi } from "vitest"
import { Convert } from "../../../../utils/Convert"
import { RequestHandler } from "../../RequestHandler"
import { ServerRuntime } from "../../ServerRuntime"
import { ServerResponse } from "../ServerResponse"

vi.mock("../../ServerRuntime")
vi.mock("../../../../utils/Convert")
vi.mock("../../../../utils/Logger", () => ({
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
vi.mock("../../RequestHandler")
vi.mock("../../ResponseHandler")

describe("ServerResponse", () => {
	let mockReq: any
	let mockRes: any

	beforeEach(() => {
		vi.clearAllMocks()
		mockReq = { __METAL_CURRENT_USER: { id: "user1" } }
		mockRes = {}
	})

	it("should call ServerRuntime.GetInfo in GetInfo", async () => {
		const intRes = { Body: { version: "1.0" } }
		vi.mocked(ServerRuntime.GetInfo).mockResolvedValue(intRes as any)

		await ServerResponse.GetInfo(mockReq, mockRes)

		expect(ServerRuntime.GetInfo).toHaveBeenCalled()
		expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes)
	})

	it("should call ServerRuntime.Reload in Reload", async () => {
		const intRes = { Body: { message: "reloaded" } }
		vi.mocked(ServerRuntime.Reload).mockResolvedValue(intRes as any)

		await ServerResponse.Reload(mockReq, mockRes)

		expect(RequestHandler.CheckRequest).toHaveBeenCalledWith(mockReq)
		expect(ServerRuntime.Reload).toHaveBeenCalledWith(mockReq.__METAL_CURRENT_USER)
		expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes)
	})

	it("should call ServerRuntime.ReloadPlans in ReloadPlans", async () => {
		const intRes = { Body: { message: "plans reloaded" } }
		vi.mocked(ServerRuntime.ReloadPlans).mockResolvedValue(intRes as any)

		await ServerResponse.ReloadPlans(mockReq, mockRes)

		expect(RequestHandler.CheckRequest).toHaveBeenCalledWith(mockReq)
		expect(ServerRuntime.ReloadPlans).toHaveBeenCalledWith(mockReq.__METAL_CURRENT_USER)
		expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes)
	})
})
