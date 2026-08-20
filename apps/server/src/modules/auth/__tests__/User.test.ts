import MockPersistentMap from "@metal/persistent-map"
import jwt from "jsonwebtoken"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { HttpErrorUnauthorized } from "../../errors/HttpErrors"
import { AuthProvider } from "../AuthProvider"
import { User } from "../User"

vi.mock("jsonwebtoken")
vi.mock("../../core/ConfigManager", () => ({
	ConfigManager: {
		Get: vi.fn().mockImplementation((path: string) => {
			if (path === "server.authentication.session-lifetime") return 14400
			if (path === "server.authentication.session-timeout") return 3600
			return undefined
		}),
	},
}))
vi.mock("@metal/persistent-map", () => {
	class MockPersistentMap {
		private _map = new Map()
		constructor(_path: string) {}
		get(key: string) {
			return this._map.get(key)
		}
		set(key: string, value: unknown) {
			this._map.set(key, value)
			return this
		}
		has(key: string) {
			return this._map.has(key)
		}
		delete(key: string) {
			this._map.delete(key)
		}
		clear() {
			this._map.clear()
		}
	}
	return { default: MockPersistentMap }
})
vi.mock("@metal/config", () => ({
	Env: {
		server: {
			sessions: { path: "test-sessions" },
		},
	},
}))
vi.mock("../AuthProvider", () => ({
	AuthProvider: {
		Provider: {
			Authenticate: vi.fn(),
			LogOut: vi.fn(),
		},
	},
}))
vi.mock("../Roles", () => ({
	Roles: {
		UserDefaultRole: "user",
	},
}))

function makeSessionRecord(overrides?: { secret?: string; lastUsedAt?: number }) {
	return {
		secret: (overrides?.secret ?? "secret") as any,
		createdAt: overrides?.lastUsedAt ?? Date.now(),
		lastUsedAt: overrides?.lastUsedAt ?? Date.now(),
	}
}

function createStore(): InstanceType<typeof MockPersistentMap> {
	return new (MockPersistentMap as any)("test-sessions")
}

describe("User", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		;(User as any)._store = createStore()
	})

	describe("Authenticate", () => {
		it("should authenticate user and return token", async () => {
			const credentials = { username: "admin", password: "password" }
			vi.mocked(AuthProvider.Provider.Authenticate).mockResolvedValue({ user: "admin", roles: ["admin"] })
			vi.mocked(jwt.sign).mockReturnValue("mock-token" as any)

			const res = await User.Authenticate(credentials)

			expect(res.Body).toEqual({ token: "mock-token" })
			expect(AuthProvider.Provider.Authenticate).toHaveBeenCalledWith(credentials)
			expect((User as any)._store.has("mock-token")).toBe(true)
		})
	})

	describe("_decodeToken", () => {
		it("should decode valid token", () => {
			const token = "valid-token"
			const record = makeSessionRecord({ secret: "secret" })
			const store = (User as any)._store as InstanceType<typeof MockPersistentMap>
			store.set(token, record)
			vi.mocked(jwt.verify).mockReturnValue({ user: "admin" } as any)

			const decoded = (User as any)._decodeToken(token)
			expect(decoded).toEqual({ user: "admin" })
			expect(jwt.verify).toHaveBeenCalledWith(token, record.secret)
		})

		it("should throw HttpErrorUnauthorized for undefined token", () => {
			expect(() => (User as any)._decodeToken(undefined)).toThrow(HttpErrorUnauthorized)
		})

		it("should throw HttpErrorUnauthorized for token not in store", () => {
			expect(() => (User as any)._decodeToken("nonexistent")).toThrow(HttpErrorUnauthorized)
		})

		it("should throw HttpErrorUnauthorized for expired session (inactivity)", () => {
			const token = "stale-token"
			const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
			const record = makeSessionRecord({ secret: "secret", lastUsedAt: twoHoursAgo })
			const store = (User as any)._store as InstanceType<typeof MockPersistentMap>
			store.set(token, record)

			expect(() => (User as any)._decodeToken(token)).toThrow(HttpErrorUnauthorized)
			expect(store.has(token)).toBe(false)
		})

		it("should throw HttpErrorUnauthorized for invalid token", () => {
			const token = "bad"
			const record = makeSessionRecord({ secret: "secret" })
			const store = (User as any)._store as InstanceType<typeof MockPersistentMap>
			store.set(token, record)
			vi.mocked(jwt.verify).mockImplementation(() => {
				throw new Error("invalid")
			})
			expect(() => (User as any)._decodeToken(token)).toThrow(HttpErrorUnauthorized)
			expect(store.has(token)).toBe(false)
		})
	})

	describe("LogOut", () => {
		it("should delete token and call provider LogOut", async () => {
			const token = "token"
			vi.spyOn(User as any, "_decodeToken").mockReturnValue({ user: "admin" })
			const record = makeSessionRecord({ secret: "secret" })
			const store = (User as any)._store as InstanceType<typeof MockPersistentMap>
			store.set(token, record)

			await User.LogOut(token)

			expect(store.has(token)).toBe(false)
			expect(AuthProvider.Provider.LogOut).toHaveBeenCalledWith("admin")
		})
	})

	describe("IsUserCredentials", () => {
		it("should return true for valid credentials", () => {
			const valid = {
				username: "admin",
				password: "password",
			}
			expect(User.IsUserCredentials(valid)).toBe(true)
		})

		it("should return false for invalid credentials", () => {
			const invalid = {
				username: "admin",
				// missing password
			}
			expect(User.IsUserCredentials(invalid)).toBe(false)
		})
	})
})
