//
//
//
import path from "node:path"
import urlJoin from "@loxjs/url-join"
import { Stringify } from "./JsonUtils/Stringify"

//
export class StringUtils {
	static Split(str: string, sep: string): string[] {
		return str.includes(sep)
			? str
					.split(sep)
					.filter((_field) => !(_field === undefined || _field.trim() === ""))
					.map((_field) => _field.trim())
			: [str]
	}

	static FixObjectMissingQuotes(str: string): string {
		const stringFixed = str.replaceAll(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
		return stringFixed.replaceAll(/:\s*([^"{[,\s][^,\s}]*)/g, ':"$1"')
	}

	static IsEmpty(str: string | undefined | null): boolean {
		return !str?.trim()
	}

	static Url(...subPaths: Array<string | undefined>) {
		const cleanSubPaths = subPaths.filter((path: string | undefined) => !StringUtils.IsEmpty(path)) as string[]
		if (cleanSubPaths.length === 0) return ""

		return urlJoin(...cleanSubPaths).replaceAll(/\\/g, "/") // NOSONAR
	}

	static Path(...subPaths: Array<string | undefined>) {
		const cleanSubPaths = subPaths.filter((path: string | undefined) => !StringUtils.IsEmpty(path)) as string[]
		if (cleanSubPaths.length === 0) return ""

		return path.posix.join(...cleanSubPaths)
	}

	static ToString<T>(value: T): string {
		if (value === null || value === undefined) {
			return ""
		}
		switch (typeof value) {
			case "string":
				return value
			case "number":
				return value.toString()
			case "object":
				return Stringify(value)
			case "boolean":
				return value ? "true" : "false"
			default:
				return String(value)
		}
	}

	static IsBase64(str: unknown): boolean {
		// simple test
		if (typeof str !== "string") {
			return false
		}

		// Check length is multiple of 4
		if (str.length % 4 !== 0) {
			return false
		}

		// Check for valid padding
		if (!/^[A-Za-z0-9+/]*={0,2}$/.test(str)) {
			return false
		}

		return true
	}

	static IsLatin(str: string) {

		return /^[\u0000-\u024F]*$/.test(str)
	}

	static IsMaliciousPath(path?: string): boolean {
		if (!path || typeof path !== "string") {
			return false
		}

		// Normalize the path by decoding common encodings
		let normalizedPath = path

		// Decode URL encoding
		try {
			normalizedPath = decodeURIComponent(normalizedPath)
		} catch {
			// If decoding fails, continue with original path
		}

		// Check for null bytes (can be used to bypass validation)
		if (normalizedPath.includes("\0") || normalizedPath.includes("%00")) {
			return true
		}

		// Check for absolute paths (starting with / or drive letters on Windows)
		if (/^([a-zA-Z]:)?[\\/]/.test(normalizedPath)) {
			return true
		}

		// Check for path traversal patterns
		const traversalPatterns = [
			// Basic traversal patterns
			/\.\.[\\/]/, // ../ or ..\
			/\.\.%2f/i, // ..%2f
			/\.\.%5c/i, // ..%5c
			/%2e%2e[\\/]/i, // %2e%2e/ or %2e%2e\
			/%2e%2e%2f/i, // %2e%2e%2f
			/%2e%2e%5c/i, // %2e%2e%5c

			// Double encoded patterns
			/%252e%252e[\\/]/i, // %252e%252e/ or %252e%252e\
			/%252e%252e%252f/i, // %252e%252e%252f
			/%252e%252e%255c/i, // %252e%252e%255c

			// UTF-8 overlong encoding
			/\.\.%c0%af/i, // ..%c0%af
			/\.\.%c1%9c/i, // ..%c1%9c

			// Multiple consecutive dots (potential traversal)
			/\.{3,}[\\/]/, // .../ or ...\
		]

		return traversalPatterns.some((pattern) => pattern.test(normalizedPath))
	}
}
