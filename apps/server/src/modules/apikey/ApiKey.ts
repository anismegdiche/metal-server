//
//
//
import { createHash, randomBytes } from "node:crypto"
//
import { Logger } from "@metal/logger"
//
import PersistentMap from "@metal/persistent-map"
import type { TUserTokenInfo } from "../auth/@types"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorNotFound, HttpErrorUnauthorized } from "../errors/HttpErrors"
import { API_KEY_BYTE_LENGTH, API_KEY_PREFIX } from "./@consts"
import type { TApiKeyCreated, TApiKeyInfo, TApiKeyRecord } from "./@types"
//
export class ApiKey {
	static readonly #store = new PersistentMap<TApiKeyRecord>("/data/api-keys")
	//
	static _hashKey(key: string): string {
		return createHash("sha256").update(key).digest("hex")
	}
	//
	static _generateKey(): string {
		const bytes = randomBytes(API_KEY_BYTE_LENGTH)
		return `${API_KEY_PREFIX.SK}${bytes.toString("hex")}`
	}
	//
	static _recordToInfo(record: TApiKeyRecord): TApiKeyInfo {
		const { hash: _, ...info } = record
		return info
	}
	//
	@Logger.LogFunction(true)
	static Create(userId: string, params: { name: string; scopes?: string[] }): TInternalResponse<TApiKeyCreated> {
		const rawKey = ApiKey._generateKey()
		const hash = ApiKey._hashKey(rawKey)
		const id = ApiKey._hashKey(`${userId}:${Date.now()}:${randomBytes(8).toString("hex")}`).slice(0, 16)
		//
		const record: TApiKeyRecord = {
			id,
			userId,
			name: params.name,
			prefix: rawKey.slice(0, 12),
			scopes: params.scopes ?? [],
			createdAt: new Date().toISOString(),
			lastUsedAt: null,
			revokedAt: null,
			hash,
		}
		//
		ApiKey.#store.set(hash, record)
		//
		Logger.Info(`API key created: ${record.prefix}*** for user=${userId} name="${params.name}"`)
		//
		return HttpResponse.Ok({ ...ApiKey._recordToInfo(record), key: rawKey })
	}
	//
	static Verify(apiKey: string): TUserTokenInfo {
		if (!apiKey?.startsWith(API_KEY_PREFIX.SK)) {
			throw new HttpErrorUnauthorized("Invalid API key format")
		}
		//
		const hash = ApiKey._hashKey(apiKey)
		const record = ApiKey.#store.get<TApiKeyRecord>(hash)
		//
		if (!record) {
			throw new HttpErrorUnauthorized("Invalid API key")
		}
		//
		if (record.revokedAt) {
			throw new HttpErrorUnauthorized("API key has been revoked")
		}
		//
		// Update lastUsedAt
		record.lastUsedAt = new Date().toISOString()
		ApiKey.#store.set(hash, record)
		//
		return {
			user: record.userId,
			roles: [],
		}
	}
	//
	@Logger.LogFunction(true)
	static List(userId: string): TInternalResponse<TApiKeyInfo[]> {
		const entries = ApiKey.#store.entries()
		//
		const keys = entries
			.map(([_, record]) => ApiKey._recordToInfo(record as TApiKeyRecord))
			// .filter((info) => info.userId === userId)
			.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
		//
		return HttpResponse.Ok(keys)
	}
	//
	@Logger.LogFunction(true)
	static Get(userId: string, keyId: string): TInternalResponse<TApiKeyInfo> {
		const entries = ApiKey.#store.entries()
		//
		const entry = entries.find(([_, record]) => {
			const r = record as TApiKeyRecord
			return r.id === keyId && r.userId === userId
		})
		//
		if (!entry) {
			throw new HttpErrorNotFound(`API key '${keyId}' not found`)
		}
		//
		return HttpResponse.Ok(ApiKey._recordToInfo(entry[1] as TApiKeyRecord))
	}
	//
	@Logger.LogFunction(true)
	static Revoke(userId: string, keyId: string): TInternalResponse<TApiKeyInfo> {
		const entries = ApiKey.#store.entries()
		//
		const entry = entries.find(([_, record]) => {
			const r = record as TApiKeyRecord
			return r.id === keyId && r.userId === userId
		})
		//
		if (!entry) {
			throw new HttpErrorNotFound(`API key '${keyId}' not found`)
		}
		//
		const record = entry[1] as TApiKeyRecord
		record.revokedAt = new Date().toISOString()
		ApiKey.#store.set(record.hash, record)
		//
		Logger.Info(`API key revoked: ${record.prefix}*** for user=${userId}`)
		//
		return HttpResponse.Ok(ApiKey._recordToInfo(record))
	}
}
