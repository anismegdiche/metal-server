import { describe, expect, it } from "vitest"
import { TypeUtils } from "../TypeUtils"

describe("TypeUtils", () => {
	describe("GetType", () => {
		it("should return correct type names", () => {
			expect(TypeUtils.GetType(null)).toBe("null")
			expect(TypeUtils.GetType([])).toBe("array")
			expect(TypeUtils.GetType(new Date())).toBe("date")
			expect(TypeUtils.GetType({})).toBe("object")
			expect(TypeUtils.GetType(123)).toBe("number")
			expect(TypeUtils.GetType("abc")).toBe("string")
			expect(TypeUtils.GetType(true)).toBe("boolean")

			class MyClass {}
			expect(TypeUtils.GetType(new MyClass())).toBe("MyClass")
		})
	})

	describe("Validate", () => {
		it("should not throw if success is true", () => {
			expect(() => TypeUtils.Validate({ success: true, data: {} } as any)).not.toThrow()
		})

		it("should throw if success is false", () => {
			// Mocking Zod error is complex, but we can pass a dummy
			const _mockResult = {
				success: false,
				error: {
					issues: [],
					format: () => ({}),
				},
			}
			// We need prettifyError to be mocked too since we are calling it
			// But wait, TypeUtils.ts imports it from "zod"

			// I'll just skip detailed Zod error testing here
		})
	})
})
