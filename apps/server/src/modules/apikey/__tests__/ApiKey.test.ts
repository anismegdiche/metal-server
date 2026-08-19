//
/** biome-ignore-all lint/style/noNonNullAssertion: <!+> */
//
//
import { beforeEach, describe, expect, it, vi } from "vitest"
//
import { ApiKey } from "../ApiKey"

vi.mock("@metal/config", () => {
	const config = { server: {} }
	return {
		Config: config,
		config,
		default: config,
	}
})

//
const mockPersistentMapStore = vi.hoisted(() => new Map<string, unknown>())
//
vi.mock("@metal/persistent-map", () => {
	class MockPersistentMap {
		set(key: string, value: unknown) {
			mockPersistentMapStore.set(key, value)
			return this
		}
		get<T>(key: string): T {
			return mockPersistentMapStore.get(key) as T
		}
		has(key: string): boolean {
			return mockPersistentMapStore.has(key)
		}
		delete(key: string): void {
			mockPersistentMapStore.delete(key)
		}
		entries() {
			return [...mockPersistentMapStore.entries()]
		}
		clear(): void {
			mockPersistentMapStore.clear()
		}
	}
	return { default: MockPersistentMap }
})
//
describe("ApiKey", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPersistentMapStore.clear()
	})
	//
	describe("Create", () => {
		it("should create an API key and return the raw key once", () => {
			const result = ApiKey.Create("test-user", { name: "test-key" })
			//
			expect(result.StatusCode).toBe(200)
			expect(result.Body).toBeDefined()
			expect(result.Body!.key).toMatch(/^sk_[a-f0-9]{64}$/)
			expect(result.Body!.name).toBe("test-key")
			expect(result.Body!.userId).toBe("test-user")
			expect(result.Body!.scopes).toEqual([])
			expect(result.Body!.revokedAt).toBeNull()
		})
		//
		it("should create an API key with custom scopes", () => {
			const result = ApiKey.Create("test-user", { name: "scoped-key", scopes: ["read", "write"] })
			//
			expect(result.Body!.scopes).toEqual(["read", "write"])
		})
	})
	//
	describe("Verify", () => {
		it("should verify a valid API key and return TUserTokenInfo", () => {
			const created = ApiKey.Create("test-user", { name: "verify-test" })
			const rawKey = created.Body!.key
			//
			const tokenInfo = ApiKey.Verify(rawKey)
			//
			expect(tokenInfo.user).toBe("test-user")
			expect(tokenInfo.roles).toEqual([])
		})
		//
		it("should throw for invalid key", () => {
			expect(() => ApiKey.Verify("sk_0000000000000000000000000000000000000000000000000000000000000000")).toThrow()
		})
		//
		it("should throw for non-sk_ key", () => {
			expect(() => ApiKey.Verify("not-a-key")).toThrow()
		})
		//
		it("should throw for revoked key", () => {
			const created = ApiKey.Create("test-user", { name: "revoke-verify" })
			const keyId = created.Body!.id
			const rawKey = created.Body!.key
			//
			ApiKey.Revoke("test-user", keyId)
			//
			expect(() => ApiKey.Verify(rawKey)).toThrow()
		})
	})
	//
	describe("List", () => {
		it("should list the user's API keys", () => {
			ApiKey.Create("user-a", { name: "key-1" })
			ApiKey.Create("user-a", { name: "key-2" })
			ApiKey.Create("user-b", { name: "key-3" })
			//
			const result = ApiKey.List("user-a")
			//
			expect(result.StatusCode).toBe(200)
			expect(result.Body).toHaveLength(2)
			expect(result.Body!.every((k) => k.userId === "user-a")).toBe(true)
		})
		//
		it("should not expose hash in listed keys", () => {
			ApiKey.Create("test-user", { name: "no-hash" })
			//
			const result = ApiKey.List("test-user")
			const key = result.Body![0]
			//
			expect(key).not.toHaveProperty("hash")
			expect(key?.prefix).toMatch(/^sk_[a-f0-9]{9}$/)
		})
	})
	//
	describe("Revoke", () => {
		it("should revoke an API key", () => {
			const created = ApiKey.Create("test-user", { name: "revoke-me" })
			const keyId = created.Body!.id
			//
			const result = ApiKey.Revoke("test-user", keyId)
			//
			expect(result.StatusCode).toBe(200)
			expect(result.Body!.revokedAt).not.toBeNull()
		})
		//
		it("should throw when revoking non-existent key", () => {
			expect(() => ApiKey.Revoke("test-user", "nonexistent")).toThrow()
		})
	})
	//
	describe("Get", () => {
		it("should get a single API key by id", () => {
			const created = ApiKey.Create("test-user", { name: "get-me" })
			const keyId = created.Body!.id
			//
			const result = ApiKey.Get("test-user", keyId)
			//
			expect(result.StatusCode).toBe(200)
			expect(result.Body!.id).toBe(keyId)
			expect(result.Body!.name).toBe("get-me")
		})
		//
		it("should throw for non-existent key", () => {
			expect(() => ApiKey.Get("test-user", "nonexistent")).toThrow()
		})
	})
})
