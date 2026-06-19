import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

function findEnvPath(): string | null {
	const candidates = [
		resolve(process.cwd(), "config", ".env"),
		resolve(import.meta.dirname, "..", "..", "..", "config", ".env"),
	]

	for (const p of candidates) {
		if (existsSync(p)) return p
	}

	return null
}

function parseEnv(content: string): Record<string, string> {
	const result: Record<string, string> = {}

	for (const line of content.split(/\r?\n/)) {
		const trimmed = line.trim()
		if (!trimmed || trimmed.startsWith("#")) continue

		const eqIndex = trimmed.indexOf("=")
		if (eqIndex === -1) continue

		const key = trimmed.slice(0, eqIndex).trim()
		let value = trimmed.slice(eqIndex + 1).trim()

		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1)
		}

		result[key] = value
	}

	return result
}

let _data: Record<string, string> | null = null

function ensure(): Record<string, string> {
	if (_data) return _data

	const envPath = findEnvPath()
	if (!envPath) {
		_data = {}
		return _data
	}

	_data = parseEnv(readFileSync(envPath, "utf-8"))
	return _data
}

export const Env = new Proxy({} as Record<string, string>, {
	get(_, key: string | symbol) {
		if (typeof key === "symbol") return undefined
		return ensure()[key]
	},
	has(_, key: string | symbol) {
		if (typeof key === "symbol") return false
		return key in ensure()
	},
	ownKeys() {
		return Reflect.ownKeys(ensure())
	},
	getOwnPropertyDescriptor(_, key: string | symbol) {
		if (typeof key === "symbol") return undefined
		return {
			enumerable: true,
			configurable: true,
			value: ensure()[key],
		}
	},
})
