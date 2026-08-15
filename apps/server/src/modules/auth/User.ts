//
//
//
import { randomBytes } from "node:crypto"
import { Env } from "@metal/config"
import { Logger } from "@metal/logger"
import PersistentMap from "@metal/persistent-map"
import type { TJson } from "@metal/types"
import jwt, { type JsonWebTokenError, type Secret } from "jsonwebtoken"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { HttpErrorUnauthorized } from "../errors/HttpErrors"
import { type TUserCredentials, type TUserToken, type TUserTokenInfo, z_TUserCredentials } from "./@types"
import { AuthProvider } from "./AuthProvider"
import { Roles } from "./Roles"

//
export class User {
	static readonly #JWT_EXPIRATION_TIME = 60 * 60 // 1 hour
	static readonly #JWT_SECRET_LENGTH = 64 // Length of the JWT secret

	static _store: PersistentMap<Secret> | undefined = undefined

	static get #tokens(): PersistentMap<Secret> {
		if (!User._store) {
			User._store = new PersistentMap<Secret>(Env.server.sessions.path)
		}
		return User._store
	}

	static _generateJwtSecret(): Secret {
		const bytes = randomBytes(User.#JWT_SECRET_LENGTH)
		return bytes.toString("hex") as Secret
	}

	static _decodeToken(userToken: TUserToken): TUserTokenInfo {
		if (userToken === undefined) throw new HttpErrorUnauthorized()

		try {
			const _decoded = jwt.verify(userToken, User.#tokens.get(userToken) as Secret)
			return _decoded as TUserTokenInfo
		} catch (error: unknown) {
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
			expiresIn: User.#JWT_EXPIRATION_TIME,
		})

		User.#tokens.set(userToken, userSecret)
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
