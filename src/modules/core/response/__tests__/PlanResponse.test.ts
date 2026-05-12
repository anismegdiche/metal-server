import { beforeEach, describe, expect, it, vi } from "vitest"
import { Assert } from "../../../../utils/Assert"
import { Convert } from "../../../../utils/Convert"
import { PlansManager } from "../../../plan/PlansManager"
import { RequestHandler } from "../../RequestHandler"
import { PlanResponse } from "../PlanResponse"

vi.mock("../../../plan/PlansManager")
vi.mock("../../../../utils/Convert")
vi.mock("../../RequestHandler")
vi.mock("../../ResponseHandler")
vi.mock("../../../../utils/Assert")

describe("PlanResponse", () => {
	let mockReq: any
	let mockRes: any

	beforeEach(() => {
		vi.clearAllMocks()
		mockReq = {
			params: { plan: "test-plan" },
			__METAL_CURRENT_USER: { id: "user1" },
		}
		mockRes = {}
	})

	it("should call PlansManager.ReloadPlan in ReloadPlan", async () => {
		const intRes = { Body: { message: "plan reloaded" } }
		vi.mocked(PlansManager.ReloadPlan).mockResolvedValue(intRes as any)

		await PlanResponse.ReloadPlan(mockReq, mockRes)

		expect(RequestHandler.CheckRequest).toHaveBeenCalledWith(mockReq)
		expect(Assert.Var).toHaveBeenCalledWith("test-plan", "plan is not defined")
		expect(PlansManager.ReloadPlan).toHaveBeenCalledWith("test-plan", mockReq.__METAL_CURRENT_USER)
		expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes)
	})
})
