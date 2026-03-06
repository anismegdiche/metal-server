import { describe, expect, it } from "vitest"
import { Global } from "../Global"

describe("Global", () => {
	it("should have initial Cache state", () => {
		expect(Global.Cache).toBeDefined()
		expect(Global.Cache.Database).toBeUndefined()
		expect(Global.Cache.Entity).toBeUndefined()
	})

	it("should allow setting values in Cache", () => {
		Global.Cache.Database = { test: 1 }
		expect(Global.Cache.Database).toEqual({ test: 1 })
		// Clean up
		Global.Cache.Database = undefined
	})
})
