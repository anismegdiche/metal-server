import { afterEach, describe, expect, it, vi } from "vitest"
import { JsonUtils } from "../JsonUtils"
import * as StringifyModule from "../JsonUtils/Stringify"

describe("JsonUtils", () => {
	describe("TryParse", () => {
		it("should parse valid JSON", () => {
			const result = JsonUtils.TryParse('{"a":1}', {})
			expect(result).toEqual({ a: 1 })
		})

		it("should return defaultValue for invalid JSON", () => {
			const result = JsonUtils.TryParse("invalid", { def: 1 }, true)
			expect(result).toEqual({ def: 1 })
		})

		it("should return defaultValue for empty string", () => {
			expect(JsonUtils.TryParse("", { a: 1 })).toEqual({ a: 1 })
		})

		it("should parse strings as dates if they look like dates", () => {
			const dateStr = "2023-01-01"
			const result = JsonUtils.TryParse(`{"d":"${dateStr}"}`, {})
			expect((result as { d: unknown }).d).toBeInstanceOf(Date)
		})
	})

	describe("Get", () => {
		it("should get value by path", () => {
			const json = { a: { b: [0, 10] } }
			expect(JsonUtils.Get(json, "a.b.1")).toBe(10)
			expect(JsonUtils.Get(json, "a.b[1]")).toBe(10)
		})

		it("should return defaultValue if path not found", () => {
			expect(JsonUtils.Get({}, "a.b", "def")).toBe("def")
		})
	})

	describe("Set", () => {
		it("should set value by path", () => {
			const json = { a: 1 }
			JsonUtils.Set(json, "b", 2)
			expect((json as { b?: unknown }).b).toBe(2)
		})
	})

	describe("SafeCopy", () => {
		it("should return a deep copy", () => {
			const json = { a: { b: 1 } }
			const copy = JsonUtils.SafeCopy(json)
			expect(copy).toEqual(json)
			expect(copy).not.toBe(json)
			expect(copy.a).not.toBe(json.a)
		})

		it("should fall back to Stringify when JSON.stringify fails", () => {
			const obj: { self?: unknown } = {}
			obj.self = obj

			vi.spyOn(StringifyModule, "Stringify").mockReturnValue('{"self":null}')

			const copy = JsonUtils.SafeCopy(obj)

			expect(copy).toEqual({ self: null })
		})

		afterEach(() => {
			vi.restoreAllMocks()
		})
	})

	describe("IsEmpty", () => {
		it("should return true for empty object", () => {
			expect(JsonUtils.IsEmpty({})).toBe(true)
		})
		it("should return false for non-empty object", () => {
			expect(JsonUtils.IsEmpty({ a: 1 })).toBe(false)
		})
	})

	describe("IsJson", () => {
		it("should return true for objects, false for others", () => {
			expect(JsonUtils.IsJson({})).toBe(true)
			expect(JsonUtils.IsJson([])).toBe(false)
			expect(JsonUtils.IsJson(null)).toBe(false)
			expect(JsonUtils.IsJson(new Date())).toBe(false)
		})
	})

	describe("RemoveUselessKeys", () => {
		it("should remove placeholder values and null arrays", () => {
			const obj = {
				remove_object_string: "[Object]",
				remove_null_array: [null, null],
				keep_empty_object: {
					remove_string_array: "[Array]",
				},
				keep_string: "ok",
			}
			JsonUtils.RemoveUselessKeys(obj)
			expect(obj).toEqual({
				keep_empty_object: {},
				keep_string: "ok",
			})
		})
	})

	describe("PrefixKeys", () => {
		it("should prefix keys recursively", () => {
			const result = JsonUtils.PrefixKeys({ a: 1, b: { c: 2 } }, "x_")
			expect(result).toEqual({ x_a: 1, x_b: { x_c: 2 } })
		})
	})

	describe("ReplaceStrings", () => {
		it("should replace strings in nested objects and arrays", () => {
			const data = { a: "foo", b: ["foo", { c: "foo" }] }
			const result = JsonUtils.ReplaceStrings(data, /foo/g, "bar")
			expect(result).toEqual({ a: "bar", b: ["bar", { c: "bar" }] })
		})
	})

	describe("RemoveUndefined", () => {
		it("should remove undefined keys", () => {
			const result = JsonUtils.RemoveUndefined({ a: 1, b: undefined })
			expect(result).toEqual({ a: 1 })
		})
	})

	describe("Join", () => {
		it("should join object entries into string", () => {
			const result = JsonUtils.Join({ a: 1, b: "x" }, ":", "|")
			expect(result).toBe('a:1|b:"x"')
		})
	})

	describe("ToTextList", () => {
		it("should format key/value pairs into lines", () => {
			const result = JsonUtils.ToTextList({ a: 1, b: "x" })
			expect(result).toContain(" - a: 1")
			expect(result).toContain(' - b: "x"')
		})
	})

	describe("ToArray", () => {
		it("should convert object to array of key/value objects", () => {
			expect(JsonUtils.ToArray({ a: 1, b: 2 })).toEqual([{ a: 1 }, { b: 2 }])
			expect(JsonUtils.ToArray(undefined)).toEqual([])
		})
	})

	describe("Size", () => {
		it("should compute byte size", () => {
			expect(JsonUtils.Size({ a: "x" })).toBeGreaterThan(0)
		})
	})

	describe("ForEach", () => {
		it("should iterate over all key-value pairs in object", () => {
			const obj = { a: 1, b: 2, c: 3 }
			const results: Array<{ key: string; value: unknown; index: number }> = []

			JsonUtils.ForEach(obj, (key, value, index) => {
				results.push({ key, value, index })
			})

			expect(results).toHaveLength(3)
			expect(results[0]).toEqual({ key: "a", value: 1, index: 0 })
			expect(results[1]).toEqual({ key: "b", value: 2, index: 1 })
			expect(results[2]).toEqual({ key: "c", value: 3, index: 2 })
		})

		it("should handle empty object", () => {
			const obj = {}
			const results: Array<{ key: string; value: unknown; index: number }> = []

			JsonUtils.ForEach(obj, (key, value, index) => {
				results.push({ key, value, index })
			})

			expect(results).toHaveLength(0)
		})

		it("should pass correct index parameter", () => {
			const obj = { first: "value1", second: "value2", third: "value3" }
			const indices: number[] = []

			JsonUtils.ForEach(obj, (_key, _value, index) => {
				indices.push(index)
			})

			expect(indices).toEqual([0, 1, 2])
		})

		it("should handle different value types", () => {
			const obj = {
				string: "hello",
				number: 42,
				boolean: true,
				null: null,
				undefined: undefined,
				object: { nested: "value" },
				array: [1, 2, 3],
			}
			const results: Array<{ key: string; value: unknown; type: string }> = []

			JsonUtils.ForEach(obj, (key, value, _index) => {
				results.push({
					key,
					value,
					type: Array.isArray(value) ? "array" : typeof value,
				})
			})

			expect(results).toHaveLength(7)
			expect(results.find((r) => r.key === "string")?.value).toBe("hello")
			expect(results.find((r) => r.key === "number")?.value).toBe(42)
			expect(results.find((r) => r.key === "boolean")?.value).toBe(true)
			expect(results.find((r) => r.key === "null")?.value).toBe(null)
			expect(results.find((r) => r.key === "undefined")?.value).toBe(undefined)
			expect(results.find((r) => r.key === "object")?.value).toEqual({ nested: "value" })
			expect(results.find((r) => r.key === "array")?.value).toEqual([1, 2, 3])
		})

		it("should allow callback to modify external state", () => {
			const obj = { a: 1, b: 2 }
			let sum = 0
			const keys: string[] = []

			JsonUtils.ForEach(obj, (key, value, _index) => {
				sum += value as number
				keys.push(key)
			})

			expect(sum).toBe(3)
			expect(keys).toEqual(["a", "b"])
		})

		it("should handle object with numeric keys", () => {
			const obj = { "0": "zero", "1": "one", "2": "two" }
			const results: Array<{ key: string; value: unknown }> = []

			JsonUtils.ForEach(obj, (key, value, _index) => {
				results.push({ key, value })
			})

			expect(results).toHaveLength(3)
			expect(results.some((r) => r.key === "0" && r.value === "zero")).toBe(true)
			expect(results.some((r) => r.key === "1" && r.value === "one")).toBe(true)
			expect(results.some((r) => r.key === "2" && r.value === "two")).toBe(true)
		})

		it("should handle object with special character keys", () => {
			const obj = {
				"with-space": "value1",
				with_underscore: "value2",
				"with.dot": "value3",
				"with/slash": "value4",
			}
			const results: Array<{ key: string; value: unknown }> = []

			JsonUtils.ForEach(obj, (key, value, _index) => {
				results.push({ key, value })
			})

			expect(results).toHaveLength(4)
			expect(results.find((r) => r.key === "with-space")?.value).toBe("value1")
			expect(results.find((r) => r.key === "with_underscore")?.value).toBe("value2")
			expect(results.find((r) => r.key === "with.dot")?.value).toBe("value3")
			expect(results.find((r) => r.key === "with/slash")?.value).toBe("value4")
		})
	})
})
