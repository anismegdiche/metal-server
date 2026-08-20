//
//
//
import { randomBytes } from "node:crypto"
import { Env } from "@metal/config"
import { Logger } from "@metal/logger"
import PersistentMap from "@metal/persistent-map"
import type { TJson } from "@metal/types"
import jwt, { type JsonWebTokenError, type Secret } from "jsonwebtoken"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorUnauthorized } from "../errors/HttpErrors"
import { type TUserCredentials, type TUserToken, type TUserTokenInfo, z_TUserCredentials } from "./@types"
import { AuthProvider } from "./AuthProvider"
import { Roles } from "./Roles"

type TSessionRecord = {
	secret: Secret
	createdAt: number
	lastUsedAt: number
}

//
export class User {
	static readonly #DEFAULT_SESSION_LIFETIME = 14400 // 4h in seconds
	static readonly #DEFAULT_SESSION_TIMEOUT = 3600 // 1h in seconds
	static readonly #JWT_SECRET_LENGTH = 64 // Length of the JWT secret
	static readonly #LAST_USED_WRITE_THRESHOLD_MS = 60 * 1000 // only persist lastUsedAt if moved by >60s

	static _store: PersistentMap<TSessionRecord> | undefined = undefined

	static get #tokens(): PersistentMap<TSessionRecord> {
		if (!User._store) {
			User._store = new PersistentMap<TSessionRecord>(Env.server.sessions.path)
		}
		return User._store
	}

	static get SessionLifetime(): number {
		return ConfigManager.Get<number>("server.authentication.session-lifetime") ?? User.#DEFAULT_SESSION_LIFETIME
	}

	static get SessionTimeout(): number {
		return (ConfigManager.Get<number>("server.authentication.session-timeout") ?? User.#DEFAULT_SESSION_TIMEOUT) * 1000
	}

	static _generateJwtSecret(): Secret {
		const bytes = randomBytes(User.#JWT_SECRET_LENGTH)
		return bytes.toString("hex") as Secret
	}

	static _decodeToken(userToken: TUserToken): TUserTokenInfo {
		if (userToken === undefined) throw new HttpErrorUnauthorized()

		const record = User.#tokens.get(userToken) as TSessionRecord | undefined
		if (!record) throw new HttpErrorUnauthorized("Session not found")

		const now = Date.now()
		if (now - record.lastUsedAt > User.SessionTimeout) {
			User.#tokens.delete(userToken)
			throw new HttpErrorUnauthorized("Session expired due to inactivity")
		}

		try {
			const _decoded = jwt.verify(userToken, record.secret as Secret)

			if (now - record.lastUsedAt > User.#LAST_USED_WRITE_THRESHOLD_MS) {
				record.lastUsedAt = now
				User.#tokens.set(userToken, record)
			}

			return _decoded as TUserTokenInfo
		} catch (error: unknown) {
			User.#tokens.delete(userToken)
			throw new HttpErrorUnauthorized((<JsonWebTokenError>error).message)
		}
	}

	static IsUserCredentials(v: unknown): v is TUserCredentials {
		return z_TUserCredentials.safeParse(v).success
	}

	@Logger.LogFunction(true)
	static async Authenticate(userCredentials: TUserCredentials): Promise<TInternalResponse<TJson>> {
		const userTokenInfo = await AuthProvider.Provider.Authenticate(userCredentials)

		// User.AddUser(userTokenInfo.user)

		userTokenInfo.roles = userTokenInfo.roles || []

		if (Roles.UserDefaultRole !== undefined && !userTokenInfo.roles.includes(Roles.UserDefaultRole))
			userTokenInfo.roles.push(Roles.UserDefaultRole)

		// Generate a JWT Secret
		const userSecret = User._generateJwtSecret()

		// Generate a JWT token and return it
		const userToken = jwt.sign(userTokenInfo, userSecret, {
			expiresIn: User.SessionLifetime,
		})

		const now = Date.now()
		User.#tokens.set(userToken, { secret: userSecret, createdAt: now, lastUsedAt: now })
		return HttpResponse.Ok({ token: userToken })
	}

	@Logger.LogFunction(true)
	static async LogOut(userToken: TUserToken): Promise<TInternalResponse<undefined>> {
		const decoded = User._decodeToken(userToken)
		if (userToken) {
			User.#tokens.delete(userToken)
			await AuthProvider.Provider.LogOut(decoded.user)
		}
		return HttpResponse.NoContent()
	}

	@Logger.LogFunction(true)
	static async GetUserInfo(userToken: TUserToken): Promise<TInternalResponse<TUserTokenInfo>> {
		return HttpResponse.Ok(User._decodeToken(userToken))
	}

	@Logger.LogFunction(true)
	static IsAuthenticated(userToken: TUserToken): TUserTokenInfo | undefined {
		if (userToken === undefined) return undefined

		return User._decodeToken(userToken)
	}

	// @Logger.LogFunction(Logger.Debug, true)
	// static AddUser(newUser: string): TInternalResponse<undefined> {
	//     if (!Config.Has(`users.${newUser}`)) {
	//         Config.Set(`users.${newUser}`, {})
	//         Config.Save()
	//         return HttpResponse.Created()
	//     }
	//     return HttpResponse.NoContent()
	// }
}
