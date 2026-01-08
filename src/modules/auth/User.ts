//
//
//
import jwt, { type JsonWebTokenError } from 'jsonwebtoken'
import type { Secret } from 'jsonwebtoken'
import { randomBytes } from 'crypto'
//
import type { TInternalResponse } from '../core/types/TInternalResponse'
import { Logger } from "../../utils/Logger"
import { HttpErrorUnauthorized } from "../errors/HttpErrors"
import { HttpResponse } from "../core/HttpResponse"
import type { TJson } from "../../types/TJson"
import { AuthProvider } from "./AuthProvider"
import type { TUserCredentials, TUserTokenInfo, TUserToken } from "./@types"
import { Roles } from "./Roles"


//
export class User {

    static readonly #JWT_EXPIRATION_TIME = 60 * 60          // 1 hour
    static readonly #JWT_SECRET_LENGTH = 64                 // Length of the JWT secret
    static readonly _tokens: Map<string, Secret> = new Map()

    static _generateJwtSecret(): Secret {
        const bytes = randomBytes(this.#JWT_SECRET_LENGTH)
        return bytes.toString('hex') as Secret
    }

    static _decodeToken(userToken: TUserToken): TUserTokenInfo {
        if (userToken === undefined)
            throw new HttpErrorUnauthorized()

        try {
            const _decoded = jwt.verify(userToken, this._tokens.get(userToken) as Secret)
            return _decoded as TUserTokenInfo
        } catch (error: unknown) {
            throw new HttpErrorUnauthorized((<JsonWebTokenError>error).message)
        }
    }

    @Logger.LogFunction(true)
    static async Authenticate(userCredentials: TUserCredentials): Promise<TInternalResponse<TJson>> {

        const userTokenInfo = await AuthProvider.Provider.Authenticate(userCredentials)

        // User.AddUser(userTokenInfo.user)

        userTokenInfo.roles = userTokenInfo.roles || []

        if (Roles.UserDefaultRole !== undefined && !userTokenInfo.roles.includes(Roles.UserDefaultRole))
            userTokenInfo.roles.push(Roles.UserDefaultRole)

        // Generate a JWT Secret
        const userSecret = this._generateJwtSecret()

        // Generate a JWT token and return it
        const userToken = jwt.sign(
            userTokenInfo,
            userSecret,
            {
                expiresIn: this.#JWT_EXPIRATION_TIME
            }
        )

        this._tokens.set(userToken, userSecret)
        return HttpResponse.Ok({ token: userToken })
    }

    @Logger.LogFunction(true)
    static async LogOut(userToken: TUserToken): Promise<TInternalResponse<undefined>> {
        const decoded = this._decodeToken(userToken)
        if (userToken) {
            this._tokens.delete(userToken)
            await AuthProvider.Provider.LogOut(decoded.user)
        }
        return HttpResponse.NoContent()
    }

    @Logger.LogFunction(true)
    static async GetUserInfo(userToken: TUserToken): Promise<TInternalResponse<TUserTokenInfo>> {
        return HttpResponse.Ok(this._decodeToken(userToken))
    }

    @Logger.LogFunction(true)
    static IsAuthenticated(userToken: TUserToken): TUserTokenInfo | undefined {
        if (userToken === undefined)
            return undefined

        return this._decodeToken(userToken)
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