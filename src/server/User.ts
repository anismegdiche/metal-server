//
//
//
//
//
import jwt, { JsonWebTokenError, Secret } from 'jsonwebtoken'
import { randomBytes } from 'crypto'
//
import { TInternalResponse } from '../types/TInternalResponse'
import { Logger } from "../utils/Logger"
import { HttpErrorUnauthorized } from "./HttpErrors"
import { HttpResponse } from "./HttpResponse"
import { TJson } from "../types/TJson"
import { AuthProvider } from "../providers/AuthProvider"
import { TUserCredentials } from "../providers/absAuthProvider"
import { Roles } from "./Roles"


//
export type TUserToken = string | undefined

export type TUserTokenInfo = {
    user: string
    roles?: string[]
}


//
export class User {

    static readonly #JWT_EXPIRATION_TIME = 60 * 60          // 1 hour
    static readonly #JWT_SECRET_LENGTH = 64                 // Length of the JWT secret
    static readonly #Tokens: Map<string, Secret> = new Map()

    static #GenerateJwtSecret(): Secret {
        const bytes = randomBytes(this.#JWT_SECRET_LENGTH)
        return bytes.toString('hex') as Secret
    }

    static #DecodeToken(userToken: TUserToken): TUserTokenInfo {
        if (userToken === undefined)
            throw new HttpErrorUnauthorized()

        try {
            const _decoded = jwt.verify(userToken, this.#Tokens.get(userToken) as Secret)
            return _decoded as TUserTokenInfo
        } catch (error: unknown) {
            throw new HttpErrorUnauthorized((<JsonWebTokenError>error).message)
        }
    }

    @Logger.LogFunction(Logger.Debug, true)
    static async Authenticate(userCredentials: TUserCredentials): Promise<TInternalResponse<TJson>> {

        const userTokenInfo = await AuthProvider.Provider.Authenticate(userCredentials)

        // User.AddUser(userTokenInfo.user)

        userTokenInfo.roles = userTokenInfo.roles || []

        if (Roles.UserDefaultRole !== undefined && !userTokenInfo.roles.includes(Roles.UserDefaultRole))
            userTokenInfo.roles.push(Roles.UserDefaultRole)

        // Generate a JWT Secret
        const userSecret = this.#GenerateJwtSecret()

        // Generate a JWT token and return it
        const userToken = jwt.sign(
            userTokenInfo,
            userSecret,
            {
                expiresIn: this.#JWT_EXPIRATION_TIME
            }
        )

        this.#Tokens.set(userToken, userSecret)
        return HttpResponse.Ok({ token: userToken })
    }

    @Logger.LogFunction(Logger.Debug, true)
    static async LogOut(userToken: TUserToken): Promise<TInternalResponse<undefined>> {
        const decoded = this.#DecodeToken(userToken)
        if (userToken) {
            this.#Tokens.delete(userToken)
            await AuthProvider.Provider.LogOut(decoded.user)
        }
        return HttpResponse.NoContent()
    }

    @Logger.LogFunction(Logger.Debug, true)
    static async GetUserInfo(userToken: TUserToken): Promise<TInternalResponse<TUserTokenInfo>> {
        return HttpResponse.Ok(this.#DecodeToken(userToken))
    }

    @Logger.LogFunction(Logger.Debug, true)
    static IsAuthenticated(userToken: TUserToken): TUserTokenInfo | undefined {
        if (userToken === undefined)
            return undefined

        return this.#DecodeToken(userToken)
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