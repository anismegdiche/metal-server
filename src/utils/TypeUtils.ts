//
//
//
//

import { type ZodSafeParseResult, type ZodIssue } from "zod"
import { HttpError, HttpErrorInternalServerError } from "../modules/errors/HttpErrorBase"
import { Logger } from "./Logger"

//
type JsonPathSegment = string | number

function toJsonPath(path: (string | number | symbol)[]): JsonPathSegment[] {
	return path.filter((s): s is JsonPathSegment => typeof s !== "symbol")
}

function formatPath(path: JsonPathSegment[]): string {
	return path.reduce<string>((acc, segment) => {
		if (typeof segment === "number") return `${acc}[${segment}]`
		if (acc === "") return segment
		return `${acc}.${segment}`
	}, "")
}

/**
 * Returns true if ALL leaf errors in a branch are "received undefined" —
 * meaning the branch's discriminating key was entirely absent from the input.
 * Such branches are lower-priority than ones where the key was present but wrong.
 */
function allLeavesReceivedUndefined(issues: ZodIssue[], base: number = 0): boolean {
	for (const issue of issues) {
		const d = base + toJsonPath(issue.path).length
		if (issue.code === "invalid_union") {
			// A union in a branch: check all its sub-branches
			const allSubsUndefined = issue.errors.every(b => allLeavesReceivedUndefined(b, d))
			if (!allSubsUndefined) return false
		} else {
			// Leaf issue: "received undefined" in the message means key was absent
			if (!issue.message.includes("received undefined")) return false
		}
	}
	return true
}

function maxLeafDepth(issues: ZodIssue[], base: number = 0): number {
	let max = base
	for (const issue of issues) {
		const d = base + toJsonPath(issue.path).length
		if (issue.code === "invalid_union") {
			for (const branch of issue.errors) {
				max = Math.max(max, maxLeafDepth(branch, d))
			}
		} else {
			max = Math.max(max, d)
		}
	}
	return max
}

/**
 * Recursively collects leaf-level issues from a Zod error tree,
 * unwrapping `invalid_union` sub-errors so custom messages are always shown.
 */
function collectIssues(issues: ZodIssue[], prefixPath: JsonPathSegment[] = []): string[] {
	const lines: string[] = []

	for (const issue of issues) {
		const fullPath = [...prefixPath, ...toJsonPath(issue.path)]

		if (issue.code === "invalid_union") {
			const branches = issue.errors
			const allBranchesUndef = branches.every(b => allLeavesReceivedUndefined(b))

			if (allBranchesUndef) {
				// None of the union branches matched any keys in the input. 
				// Output the union's own message (e.g. "Invalid input") instead of 
				// arbitrarily picking the first branch and complaining about its keys.
				const pathStr = formatPath(fullPath)
				const location = pathStr ? `\n  → at ${pathStr}` : ""
				lines.push(`✖ ${issue.message}${location}`)
				continue
			}

			const best = branches.reduce<ZodIssue[]>((prev, curr) => {
				const prevAllUndef = allLeavesReceivedUndefined(prev)
				const currAllUndef = allLeavesReceivedUndefined(curr)

				// 1. Prefer branches where a key was actually present (not all "received undefined")
				if (prevAllUndef && !currAllUndef) return curr
				if (!prevAllUndef && currAllUndef) return prev

				// 2. Tiebreaker: deepest leaf error path
				return maxLeafDepth(curr) > maxLeafDepth(prev) ? curr : prev
			}, branches[0] ?? [])
			lines.push(...collectIssues(best, fullPath))
		} else {
			const pathStr = formatPath(fullPath)
			const location = pathStr ? `\n  → at ${pathStr}` : ""
			lines.push(`✖ ${issue.message}${location}`)
		}
	}

	return lines
}

function prettifyZodError(issues: ZodIssue[]): string {
	return collectIssues(issues).join("\n")
}

//
export class TypeUtils {
	static Validate<T>(result: ZodSafeParseResult<T>, httpError: HttpError = new HttpErrorInternalServerError()) {
		if (result.success) return

		const prettyErrors = prettifyZodError(result.error.issues)
		Logger.Error(`${httpError.Name}:\r\n\r\n${prettyErrors}\r\n`)
		httpError.message = prettyErrors
		httpError.Name = "Bad Parameters"
		delete httpError.stack
		throw httpError
	}

	static GetType(v: unknown): string {
		if (v === null) return "null"

		const t = typeof v
		if (t !== "object") return t

		if (Array.isArray(v)) return "array"

		if (v instanceof Date) return "date"

		const ctor = (v as { constructor?: new (...args: unknown[]) => unknown })?.constructor
		if (ctor && ctor !== Object && ctor.name) return ctor.name

		return "object"
	}
}
