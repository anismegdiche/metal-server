import { describe, expect, it } from "vitest"
import { Break } from "../Break"


describe("Break", () => {
	it("should return undefined to signal break", async () => {
		const stepParams = null // Valid null for break parameters

		const result = await Break(stepParams, {})

		expect(result).toEqual(true)
	})

	it("should validate step parameters", async () => {
		const stepParams = "invalid" // Invalid type

		// Should throw assertion error for invalid parameters
		await expect(Break(stepParams, {})).rejects.toThrow()
	})	

	it("should return true for js true expression ", async () => {
		const stepParams = "${{ 1==1 }}"

		// Should throw assertion error for invalid parameters
		const result = await Break(stepParams, {})
		expect(result).toEqual(true)
	})	

	it("should return false for js false expression ", async () => {
		const stepParams = "${{ 1==2 }}"

		// Should throw assertion error for invalid parameters
		const result = await Break(stepParams, {})
		expect(result).toEqual(false)
	})
})
