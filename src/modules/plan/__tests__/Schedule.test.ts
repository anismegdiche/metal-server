import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConfigManager } from "../../core/ConfigManager"
import { Schedule } from "../Schedule"

vi.mock("cron", () => {
	const CronJob = vi.fn(function (this: any) {
		this.start = vi.fn()
		this.stop = vi.fn()
	})
	return { CronJob }
})

vi.mock("../../core/ConfigManager")
vi.mock("../Plans")
vi.mock("../../auth/Roles")

describe("Schedule", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		Schedule.Jobs = []
	})

	describe("Init", () => {
		it("should create and start jobs from config", async () => {
			vi.mocked(ConfigManager.Has).mockReturnValue(true)
			vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
				if (key === "schedules")
					return {
						job1: { cron: "* * * * *", plan: "p1" },
					}
				if (key === "server.timezone") return "UTC"
				return undefined
			})

			await Schedule.Init()

			expect(Schedule.Jobs.length).toBe(1)
			expect(Schedule.Jobs[0]?.schedule).toBe("job1")
		})
	})

	describe("StopAll", () => {
		it("should stop all registered jobs", () => {
			const stopMock = vi.fn()
			Schedule.Jobs = [{ schedule: "j1", cronJob: { stop: stopMock } as any }]

			Schedule.StopAll()
			expect(stopMock).toHaveBeenCalled()
		})
	})
})
