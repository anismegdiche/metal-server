import { uuidv7 } from "uuidv7"
import { describe, expect, it, vi } from "vitest"
import { Utils } from "../Utils"

vi.mock("uuidv7", () => ({
	uuidv7: vi.fn().mockReturnValue("mock-uuid-v7"),
}))

describe("Utils", () => {
	describe("Sleep", () => {
		it("should sleep for the specified duration", async () => {
			const start = Date.now()
			await Utils.Sleep(100)
			const end = Date.now()
			expect(end - start).toBeGreaterThanOrEqual(90)
		})
	})

	describe("Uuid", () => {
		it("should return a uuidv7", () => {
			const uuid = Utils.Uuid()
			expect(uuidv7).toHaveBeenCalled()
			expect(uuid).toBe("mock-uuid-v7")
		})

		it("should return a safe uuidv7 (no dashes)", () => {
			vi.mocked(uuidv7).mockReturnValue("mock-uuid-with-dashes")
			const uuid = Utils.Uuid(true)
			expect(uuid).toBe("mockuuidwithdashes")
		})
	})

	describe("Wait", () => {
		it("should resolve to true when condition is met", async () => {
			const condition = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)

			const result = await Utils.Wait(condition, 10, 100)
			expect(result).toBe(true)
			expect(condition).toHaveBeenCalledTimes(2)
		})

		it("should resolve to false when timeout is reached", async () => {
			const condition = vi.fn().mockResolvedValue(false)

			const result = await Utils.Wait(condition, 10, 50)
			expect(result).toBe(false)
		})

		it("should resolve to false when condition throws", async () => {
			const condition = vi.fn().mockRejectedValue(new Error("fail"))

			const result = await Utils.Wait(condition, 10, 100)
			expect(result).toBe(false)
		})
	})
})
