//
//
//
import { type Database, open } from "lmdb"


//
export class PersistentMap<T> {
	private db: Database
	private _path: string

	constructor(path: string) {
		this._path = path
		this.db = open({ path })
	}

	get Path() {
		return this._path
	}

	set<T>(key: string | number, value: T | unknown): this {
		this.db.putSync(String(key), value)
		return this
	}

	get<T>(key: string | number): T {
		return this.db.get(String(key)) as T
	}

	has(key: string | number): boolean {
		const value = this.db.get(String(key))
		return value !== undefined
	}

	delete(key: string | number): void {
		this.db.removeSync(String(key))
	}

	entries(): [string, T][] {
		const result: [string, T][] = []
		const range = this.db.getRange({ start: "", end: "\uffff" })
		for (const { key, value } of range) {
			result.push([String(key), value])
		}
		return result
	}

	findRange(start: string | number, end: string | number): [string, T][] {
		const result: [string, T][] = []
		const range = this.db.getRange({ start: String(start), end: String(end) })
		for (const { key, value } of range) {
			result.push([String(key), value])
		}
		return result
	}

	clear(): void {
		this.db.clear()
	}

	close(): void {
		this.db.close()
	}
}

export default PersistentMap
