import { describe, expect, it } from "vitest"
import { LangUtils } from "../LangUtils"

describe("LangUtils", () => {
	describe("Convert", () => {
		it("should return undefined if lang is not provided", () => {
			expect(LangUtils.Convert(undefined, {}, {})).toBeUndefined()
		})

		it("should convert lang based on src and tgt maps", () => {
			const src = { EN: "english", FR: "french" }
			const tgt = { EN: "eng", FR: "fra" }

			expect(LangUtils.Convert("english", src, tgt)).toBe("eng")
			expect(LangUtils.Convert("french", src, tgt)).toBe("fra")
		})

		it("should return null if no match is found", () => {
			const src = { EN: "english" }
			const tgt = { EN: "eng" }

			expect(LangUtils.Convert("spanish", src, tgt)).toBeNull()
		})
	})
})
