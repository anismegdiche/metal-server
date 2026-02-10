//
//
//
import { intersection, merge } from 'lodash-es'
import type { Client } from "openid-client"
import { Issuer, TokenSet } from "openid-client"
import z from "zod"
//
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from '../../../utils/Logger'
import { ConfigManager } from "../../core/ConfigManager"
import { HttpErrorInternalServerError, HttpErrorUnauthorized, NormalizeError } from '../../errors/HttpErrors'
import { AUTH_PROVIDER } from "../@consts"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from '../base/absAuthProvider'


//
enum OIDC_ERROR_MESSAGE {
    NOT_INITIALIZED = 'OIDC client not initialized'
}


//
export const z_U_config_server_authentication_oidc = z.object({
    provider: z.literal(AUTH_PROVIDER.OIDC),
    issuer: z.string(),
    "client-id": z.string(),
    "client-secret": z.string(),
    scope: z.string().optional(),
    "roles-path": z.string().optional(),
});


//
export type U_config_server_authentication_oidc = z.infer<typeof z_U_config_server_authentication_oidc>;


//
export class OidcAuth extends absAuthProvider {

    #OidcClient: Client | null = null
    #Config?: U_config_server_authentication_oidc
    readonly #TokenCache: Map<string, TokenSet> = new Map()


    GetUsers() {
        // Since Oidc users are managed externally, return empty object
        return {}
    }

    readonly DEFAULT: Partial<U_config_server_authentication_oidc> = {
        scope: "openid roles",
        "roles-path": "realm_access.roles"
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {
        //TODO workaround for SSL/TLS errors
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

        this.#Config = merge(
            this.DEFAULT,
            ConfigManager.Get<U_config_server_authentication_oidc>("server.authentication")
        )

        if (this.#Config.issuer)
            this.#Config.issuer = `${this.#Config.issuer}/.well-known/openid-configuration`

        Logger.Info(`Initializing OIDC authentication provider ${this.#Config.issuer} ...`)

        if (!this.#Config)
            throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

        try {
            const oidcIssuer = await Issuer.discover(this.#Config.issuer)
            this.#OidcClient = new oidcIssuer.Client({
                client_id: this.#Config['client-id'],
                client_secret: this.#Config["client-secret"],
                response_types: ['token']
            })
        } catch (err: unknown) {
            throw new HttpErrorInternalServerError(`Failed to initialize OIDC Authentication: ${NormalizeError(err).message}`)
        }
    }

    async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        if (!this.#OidcClient || !this.#Config)
            throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

        const { username, password } = userCredentials

        try {
            const tokenSet = await this.#OidcClient.grant({
                grant_type: 'password',
                username,
                password,
                scope: this.#Config.scope
            })

            this.#TokenCache.set(username, tokenSet)

            const userInfo = await this.#OidcClient.userinfo(tokenSet.access_token!)

            const userRoles: string[] = JsonUtils.Get(userInfo, this.#Config["roles-path"]) ?? []

            // const decodedToken = jwt.decode(tokenSet.access_token!) as JwtPayload
            const roles = intersection(
                userRoles,
                Object.keys(ConfigManager.Get("roles") ?? {})
            )

            return {
                user: username,
                roles
            }

        } catch (err: unknown) {
            throw new HttpErrorUnauthorized(`Authentication failed: ${NormalizeError(err).message}`)
        }
    }

    async LogOut(username: string): Promise<void> {
        if (!this.#OidcClient)
            throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

        try {
            const tokenSet = this.#TokenCache.get(username)
            if (tokenSet) {
                await this.#OidcClient.revoke(tokenSet.access_token!)
                this.#TokenCache.delete(username)
            }
            Logger.Debug(`User ${username} logged out`)
        } catch (err: unknown) {
            Logger.Error(`Error during logout for user ${username}: ${NormalizeError(err).message}`)
        }
    }
}