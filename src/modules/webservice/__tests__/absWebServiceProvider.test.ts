

import type { Readable } from "node:stream"
import { describe, expect, it } from "vitest"
import type { TJson } from "../../../types/TJson"
import type { TContext } from "../../sandbox/types/TContext"
import type { U__source_webservice, U__source_webservice_options } from "../../source/providers/WebServiceData"
import { absWebServiceProvider } from "../base/absWebServiceProvider"

class mockWS extends absWebServiceProvider {
	
	DEFAULT: unknown
	ConfigSource?: U__source_webservice
	ConfigSourceOptions?: U__source_webservice_options
	Client?: unknown
	Init(): Promise<void> {
		throw new Error("Method not implemented.")
	}
	Connect(): Promise<void> {
		throw new Error("Method not implemented.")
	}
	Disconnect(): Promise<void> {
		throw new Error("Method not implemented.")
	}
	Read(_$context: Partial<TContext>): Promise<Readable> {
		throw new Error("Method not implemented.")
	}
	Create(_data: TJson, _$context: Partial<TContext>): Promise<Readable> {
		throw new Error("Method not implemented.")
	}
	Update(_data: TJson, _$context: Partial<TContext>): Promise<Readable> {
		throw new Error("Method not implemented.")
	}
	Delete(_$context: Partial<TContext>): Promise<Readable> {
		throw new Error("Method not implemented.")
	}
}

describe("absWebServiceProvider", () => {
	describe("IsEndpoint", () => {
		it("should return true for valid endpoint", () => {
			const valid = {
				Method: "GET",
				Url: "http://example.com",
				Data: {},
			}
			const mockInstance = new mockWS() 
			expect(mockInstance.IsEndpoint(valid)).toBe(true)
		})

		it("should return false for invalid endpoint", () => {
			const invalid = {
				Method: "GET",
				// missing Url
				Data: {},
			}
			const mockInstance = new mockWS() 
			expect(mockInstance.IsEndpoint(invalid)).toBe(false)
		})
	})
})
