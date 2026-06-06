import { setTimeout } from "node:timers"
import { describe, expect, it, vi } from "vitest"
import { Synchronizer } from "../Synchronizer"

vi.useFakeTimers()

describe("Synchronizer", () => {
	it("should return the same result for concurrent calls and than a different result after a delay", async () => {
		const syncOnce = new Synchronizer()
		const promises = Array(10)
			.fill(0)
			.map(() =>
				syncOnce.Execute(async () => {
					await new Promise((resolve) => setTimeout(resolve, 2000)) 
					return Math.random()
				}),
			)

		const results = await Promise.all(promises)
		expect(results.every((result) => result === results[0])).toBe(true)

		const initialResult = results.at(0)

		const subsequentPromise = syncOnce.Execute(async () => {
			await new Promise((resolve) => setTimeout(resolve, 5000))
			return Math.random()
		})

		const subsequentResult = await subsequentPromise
		expect(subsequentResult).not.toBe(initialResult)
	}, 30_000)

	it("should return a different result after the initial result has been resolved", async () => {
		const syncOnce = new Synchronizer()
		const initialPromise = syncOnce.Execute(async () => {
			await new Promise((resolve) => setTimeout(resolve, 5000))
			return Math.random()
		})

		const initialResult = await initialPromise

		vi.runOnlyPendingTimers()

		const subsequentPromise = syncOnce.Execute(async () => {
			await new Promise((resolve) => setTimeout(resolve, 5000))
			return Math.random()
		})

		const subsequentResult = await subsequentPromise

		expect(subsequentResult).not.toBe(initialResult)
	}, 30_000)

	it("should resolve pending callers with the first result", async () => {
		const syncOnce = new Synchronizer()
		let resolveFirst: (value: string) => void = () => {}

		const firstPromise = syncOnce.Execute(
			async () =>
				new Promise<string>((resolve) => {
					resolveFirst = resolve
				}),
		)

		const queuedPromises = Array.from({ length: 3 }, () => syncOnce.Execute(async () => "queued-result"))

		resolveFirst?.("first-result")

		const results = await Promise.all([firstPromise, ...queuedPromises])

		expect(results).toEqual(["first-result", "first-result", "first-result", "first-result"])
	})
})
