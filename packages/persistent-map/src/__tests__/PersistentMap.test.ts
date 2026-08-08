//
//
//
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PersistentMap } from "../PersistentMap"

//
let dir: string
let map: PersistentMap<unknown>

//
beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "metal-persistent-map-"))
	map = new PersistentMap(join(dir, "db"))
})

//
afterEach(() => {
	map.close()
	rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
})

//
describe("PersistentMap", () => {
	it("stores and reads values by string and number keys", () => {
		map.set("name", "metal")
		map.set(42, "answer")

		expect(map.get("name")).toBe("metal")
		expect(map.get(42)).toBe("answer")
		expect(map.get("42")).toBe("answer")
	})

	it("reads values with the stored type", () => {
		map.set("count", 3)
		expect(map.get<number>("count")).toBe(3)
	})

	it("checks key existence with has", () => {
		expect(map.has("missing")).toBe(false)

		map.set("present", true)
		expect(map.has("present")).toBe(true)
	})

	it("deletes keys", () => {
		map.set("temp", "value")
		map.delete("temp")
		expect(map.has("temp")).toBe(false)
	})

	it("lists all entries in key order", () => {
		map.set("a", 1)
		map.set("b", 2)
		expect(map.entries()).toEqual([
			["a", 1],
			["b", 2],
		])
	})

	it("finds entries within a range (start inclusive, end exclusive)", () => {
		map.set("a", 1)
		map.set("b", 2)
		map.set("c", 3)

		expect(map.findRange({ start: "a", end: "c" })).toEqual([
			["a", 1],
			["b", 2],
		])
		expect(map.findRange({ start: "b", end: "c" })).toEqual([["b", 2]])
		expect(map.findRange({ start: "a", end: "c", reverse: true })).toEqual([
			["c", 3],
			["b", 2],
		])
		expect(map.findRange({ start: "a", end: "d", limit: 2 })).toEqual([
			["a", 1],
			["b", 2],
		])
		expect(map.findRange({ start: "a", end: "d", offset: 1 })).toEqual([
			["b", 2],
			["c", 3],
		])
	})

	it("clears all entries", () => {
		map.set("a", 1)
		map.clear()
		expect(map.entries()).toEqual([])
	})

	it("exposes the database path", () => {
		expect(map.Path).toContain("metal-persistent-map-")
	})
})
