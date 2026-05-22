

import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigManager } from "../../core/ConfigManager"
import { Plan } from "../Plan"
import { Plans } from "../Plans"
import { PlansManager } from "../PlansManager"
import { PlanMetrics } from "../metrics/PlanMetrics"
import { Schedule } from "../Schedule"

vi.mock("../../core/ConfigManager")
vi.mock("../Schedule")
vi.mock("../Plan", () => {
	const Plan = vi.fn(function (this: any, name: string) {
		this.Name = name
		this.Init = vi.fn().mockResolvedValue(undefined)
		this.Dispose = vi.fn().mockResolvedValue(undefined)
		this.Reload = vi.fn().mockResolvedValue({ Body: { plan: name } })
	})
	return { Plan }
})

describe("PlansManager", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		Plans.clear()
		PlanMetrics.Metrics.clear()
	})

	describe("Init", () => {
		it("should create and initialize plans from config", async () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockReturnValue({
				plan1: {},
				plan2: {},
			})

			await PlansManager.Init()

			expect(Plan).toHaveBeenCalledTimes(2)
			expect(Plans.size).toBe(2)
			expect(Plans.has("plan1")).toBe(true)
			expect(Plans.has("plan2")).toBe(true)
		})
	})

	describe("Reload", () => {
		it("should reload config and update plans/schedules", async () => {
			// Setup initial state
			Plans.set("oldPlan", new Plan("oldPlan") as any)
			Plans.set("stayPlan", new Plan("stayPlan") as any)

			vi.mocked(ConfigManager.Load).mockResolvedValue({
				plans: {
					stayPlan: {},
					newPlan: {},
				},
				schedules: {},
			} as any)

			await PlansManager.Reload()

			expect(ConfigManager.Set).toHaveBeenCalledWith("plans", expect.anything())
			expect(ConfigManager.Set).toHaveBeenCalledWith("schedules", expect.anything())

			expect(Plans.has("oldPlan")).toBe(false)
			expect(Plans.has("stayPlan")).toBe(true)
			expect(Plans.has("newPlan")).toBe(true)

			expect(Schedule.StopAll).toHaveBeenCalled()
			expect(Schedule.Init).toHaveBeenCalled()
		})
	})

	describe("ReloadPlan", () => {
		it("should reload a specific plan and refresh schedules", async () => {
			const mockPlan = new Plan("test-plan") as any
			Plans.set("test-plan", mockPlan)

			const result = await PlansManager.ReloadPlan("test-plan", { roles: ["admin"] } as any)

			expect(mockPlan.Reload).toHaveBeenCalled()
			expect(Schedule.StopAll).toHaveBeenCalled()
			expect(Schedule.Init).toHaveBeenCalled()
			expect(result.Body).toHaveProperty("message", "Plan 'test-plan' and schedules reloaded")
		})

		it("should throw error if plan not found", async () => {
			await expect(PlansManager.ReloadPlan("missing", {} as any)).rejects.toThrow()
		})
	})

	describe("GetPlanMetrics", () => {
		it("should return metrics for a completed plan", () => {
			const mockMetrics = {
				startTime: new Date("2025-01-01T00:00:00.000Z"),
				endTime: new Date("2025-01-01T00:00:01.500Z"),
				durationMs: 1500,
				status: "success",
				steps: [
					{ index: 0, command: "select", status: "completed", outcome: "success", durationMs: 200 },
				],
			}
			const mockPlan = new Plan("test-plan") as any
			mockPlan.Metrics = mockMetrics
			Plans.set("test-plan", mockPlan)
			PlanMetrics.Metrics.set("test-plan", mockMetrics as any)

			const result = PlansManager.GetPlanMetrics("test-plan")

			expect(result.StatusCode).toBe(200)
			expect(result.Body).toEqual({
				startTime: mockMetrics.startTime,
				endTime: mockMetrics.endTime,
				durationMs: 1500,
				status: "success",
				steps: mockMetrics.steps,
			})
		})

		it("should compute live durationMs when plan is still running", () => {
			const startTime = new Date(Date.now() - 5000)
			const mockMetrics = {
				startTime,
				status: "success",
				steps: [
					{ index: 0, command: "select", status: "completed", outcome: "success", durationMs: 200 },
					{ index: 1, command: "update", status: "running" },
				],
			}
			const mockPlan = new Plan("test-plan") as any
			mockPlan.Metrics = mockMetrics
			Plans.set("test-plan", mockPlan)
			PlanMetrics.Metrics.set("test-plan", mockMetrics as any)

			const result = PlansManager.GetPlanMetrics("test-plan")

			expect(result.Body).not.toHaveProperty("endTime")
			expect(result.Body).toHaveProperty("durationMs")
			expect(typeof (result.Body as any).durationMs).toBe("number")
			expect((result.Body as any).durationMs).toBeGreaterThanOrEqual(5000)
		})

		it("should throw error if plan not found", () => {
			expect(() => PlansManager.GetPlanMetrics("missing")).toThrow()
		})

		it("should throw error if plan has no metrics", () => {
			const mockPlan = new Plan("test-plan") as any
			mockPlan.Metrics = undefined
			Plans.set("test-plan", mockPlan)

			expect(() => PlansManager.GetPlanMetrics("test-plan")).toThrow()
		})
	})
})
