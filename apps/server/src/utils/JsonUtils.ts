
//
//
//
import { strict } from "chrono-node";
import equal from "fast-deep-equal";
import { forEach, forOwn, get, isEmpty, isObject, isString, pickBy, set } from "lodash-es";
import objectPath from "object-path";
//
import type { TJson } from "../types/TJson";
import { Stringify } from "./JsonUtils/Stringify";
import { ToTextList as _ToTextList } from "./JsonUtils/ToTextList";


//
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const HEX_REGEX = /^[0-9a-f]{20,}$/i // long hex strings (tokens, hashes)
const JSON_USELESS_KEYS = new Set(["[Object]", "[Array]"])


//
type Dictionary<T> = Record<string, T>


//
export class JsonUtils {
	static TryParse<T>(jsonString: string | undefined, defaultValue: T, silent: boolean = false): T {
		if (!jsonString) return defaultValue

		try {
			return JSON.parse(jsonString, (_key, value) => {
				if (typeof value !== "string") return value

				// 1. Reject known data types that should NOT be interpreted as dates
				if (BASE64_REGEX.test(value)) return value
				if (UUID_REGEX.test(value)) return value
				if (HEX_REGEX.test(value)) return value

				// 2. Very short strings cannot be real dates
				if (value.length < 4) return value

				// 4. Try parsing with chrono STRICT
				const parsed = strict.parseDate(value)
				if (parsed !== null && !Number.isNaN(parsed.getTime())) return parsed

				return value
			})
		} catch (error) {
			if (!silent) console.error(`JsonUtils.TryParse Error: ${JsonUtils.Stringify(error)}`)
			return defaultValue
		}
	}

	static Get<T>(json: TJson, jsonPath?: string | null, defaultValue?: T): T {
		if (!jsonPath || jsonPath === null) 
			return json as T

		const _jsonPath = jsonPath.replaceAll(/\[(\d+)\]/g, ".$1")

		const extractedData = objectPath.get(json, _jsonPath) ?? get(json, jsonPath)

		return extractedData ? (extractedData as T) : (defaultValue as T)
	}

	static Set<T extends object>(json: T, jsonPath?: string | null, data?: any): T {
		if (jsonPath && jsonPath !== null) {
			json = set(json, jsonPath, data)
		} else {
			json = data as T
		}
		return json
	}

	static Stringify<T>(json: T): string {
		return Stringify(json)
	}

	static SafeCopy<T>(json: T): T {
		try {
			return JSON.parse(JSON.stringify(json))

		} catch (_error) {
			const _json = JSON.parse(JsonUtils.Stringify(json))
			JsonUtils.RemoveUselessKeys(_json)
			return _json
		}
	}

	static Size<T>(json: T): number {
		const jsonString = JsonUtils.Stringify(json)
		return Buffer.byteLength(jsonString, "utf8")
	}

	static RemoveUselessKeys(obj: any): void {
		forOwn(obj, (value, key) => {
			if (isObject(value)) {
				JsonUtils.RemoveUselessKeys(value)
			}

			if (JSON_USELESS_KEYS.has(value) || (Array.isArray(value) && value.every((v) => v === null))) {
				delete obj[key]
			}
		})
	}

	static ToArray(obj: TJson | undefined): TJson[] {
		if (!obj) return []

		return Object.entries(obj).map(([k, v]) => ({ [k]: v }))
	}

	static PrefixKeys(obj: TJson, prefix: string = ""): TJson {
		const result: TJson = {}

		forEach(obj, (value, key) => {
			const newKey = `${prefix}${key}`

			result[newKey] =
				isObject(value) && value !== null && !Array.isArray(value) ? JsonUtils.PrefixKeys(value as TJson, prefix) : value
		})

		return result
	}

	static IsEmpty<T>(obj: Dictionary<T>): boolean {
		return isEmpty(obj)
	}

	static ReplaceStrings(obj: TJson, pattern: RegExp, replacement: string): TJson {
		if (!obj) return obj

		const entries = Object.entries(obj)
		const updated = entries.map(([key, value]) => {
			switch (true) {
				case isString(value):
					return [key, value.replaceAll(pattern, replacement)]
				case JsonUtils.IsJson(value):
					return [key, JsonUtils.ReplaceStrings(value as TJson, pattern, replacement)]
				case Array.isArray(value):
					return [
						key,
						value.map((item) =>
							typeof item === "string"
								? item.replaceAll(pattern, replacement)
								: JsonUtils.IsJson(item)
									? JsonUtils.ReplaceStrings(item as TJson, pattern, replacement)
									: item,
						),
					]
				default:
					return [key, value]
			}
		})

		return Object.fromEntries(updated) as TJson
	}

	static IsJson(obj: unknown): boolean {
		return (
			typeof obj === "object" &&
			obj !== null &&
			!Array.isArray(obj) &&
			!(obj instanceof Date) &&
			!(obj instanceof RegExp) &&
			!(obj instanceof Map) &&
			!(obj instanceof Set)
		)
	}

	static RemoveUndefined<T>(obj: T): T {
		return pickBy(obj as object, (v) => v !== undefined) as T
	}

	static Join(json: TJson | undefined, keyValueSeparator: string = "=", propertiesSeparator: string = ",") {
		if (!json) return ""

		const parts: string[] = []

		forEach(json, (value, key) => {
			parts.push(`${key}${keyValueSeparator}${JsonUtils.Stringify(value)}`)
		})

		return parts.join(propertiesSeparator)
	}

	static ToTextList(json?: TJson): string {
		return _ToTextList(json)
	}

	static ForEach(json: TJson, callback: (key: string, value: any, index: number) => void) {
		Object.keys(json).forEach((key, index) => {
			callback(key, json[key], index)
		})
	}

	static IsEqual<T = TJson>(json1: T, json2: T): boolean {
		return equal(json1, json2)
	}
}
