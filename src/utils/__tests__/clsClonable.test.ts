import { describe, expect, it } from "vitest"
import { clsClonable } from "../base/clsClonable"

class ExampleClonable extends clsClonable {
	constructor(public payload: { nested: { count: number } }) {
		super()
	}
}

describe("clsClonable", () => {
	it("should deep clone the instance", () => {
		const instance = new ExampleClonable({ nested: { count: 1 } })

		const clone = instance.Clone<ExampleClonable>()

		expect(clone).not.toBe(instance)
		expect(clone.payload).toEqual(instance.payload)
		expect(clone.payload).not.toBe(instance.payload)
		expect(clone.payload.nested).not.toBe(instance.payload.nested)
	})
})
