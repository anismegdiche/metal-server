//
//
//
import { type Database, open } from "lmdb"


//
export class PersistentMap<T> {
	private db: Database
	private namespace: string

	constructor(path: string) {
		this.namespace = path
		this.db = open({ path })
	}

	async set(key: string | number, value: unknown): Promise<this> {
		await this.db.put(String(key), value)
		return this
	}

	async get(key: string | number): Promise<T> {
		return this.db.get(String(key)) as T
	}

	async has(key: string | number): Promise<boolean> {
		const value = await this.db.get(String(key))
		return value !== undefined
	}

	async delete(key: string | number): Promise<void> {
		await this.db.remove(String(key))
	}

	async entries(): Promise<[string, T][]> {
		const result: [string, T][] = []
		const range = this.db.getRange({ start: "", end: "\uffff" })
		for await (const { key, value } of range) {
			result.push([String(key), value])
		}
		return result
	}

	async findRange(start: string | number, end: string | number): Promise<[string, T][]> {
		const result: [string, T][] = []
		const range = this.db.getRange({ start: String(start), end: String(end) })
		for await (const { key, value } of range) {
			result.push([String(key), value])
		}
		return result
	}

	async clear(): Promise<void> {
		await this.db.clearAsync()
	}

	async close(): Promise<void> {
		this.db.close()
	}
}

export default PersistentMap
