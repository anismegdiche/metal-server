import { beforeEach, describe, expect, it, vi } from "vitest"
import { DataTable } from "../../../../types/DataTable"
import type { TContext } from "../../../sandbox/types/TContext"
import { STEP_STATUS } from "../../@consts"
import type { U__plans_plan_pick_Params } from "../../types/U__plans_params"
import { Pick } from "../Pick"

// Mock setup
vi.mock("../../../utils/Logger", () => ({
	LOGGER_DEFAULT_LEVEL: "info",
	VERBOSITY: { DEBUG: "debug" },
	Logger: {
		LogFunction: () => (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
		Info: vi.fn(),
		Error: vi.fn(),
		Debug: vi.fn(),
		In: "",
		Out: "",
	},
}))

// Test data setup
const myPlanEntity1 = new DataTable("myPlanEntity1", [
	{ name: "David", age: 28 },
	{ name: "Eve", age: 32 },
	{ name: "Frank", age: 36 },
	{ name: "Grace", age: 40 },
	{ name: "Henry", age: 44 },
])
await myPlanEntity1.RowsSet()

describe("Pick", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		myPlanEntity1.Pick = vi.fn().mockReturnThis()
	})

	it("should call DataTable.Pick with arguments", async () => {
		const $context: Partial<TContext> = {
			$schema: "mySchema",
			$plan: {
				name: "myPlan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: myPlanEntity1,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_pick_Params>{
			fields: ["f1", "f2"],
		}

		await Pick(stepParams, $context)
		expect(myPlanEntity1.Pick).toHaveBeenCalledWith(["f1", "f2"])
	})

	it("should return original table if *", async () => {
		const $context: Partial<TContext> = {
			$schema: "mySchema",
			$plan: {
				name: "myPlan",
				currentStep: {
					index: undefined,
					command: undefined,
					params: undefined,
					status: STEP_STATUS.PENDING,
				},
				data: myPlanEntity1,
			},
			$vars: {},
		}

		const stepParams = <U__plans_plan_pick_Params>{
			fields: ["*"],
		}

		const result = await Pick(stepParams, $context)
		expect(result).toBe(myPlanEntity1)
		expect(myPlanEntity1.Pick).not.toHaveBeenCalled()
	})
})
