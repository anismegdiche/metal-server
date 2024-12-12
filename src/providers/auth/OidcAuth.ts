//
//
//
//
//
import { Issuer, Client, TokenSet } from "openid-client"
import _ from 'lodash'
//
import { Logger } from '../../utils/Logger'
import { Config } from '../../server/Config'
import { absAuthProvider, TUserCredentials } from '../absAuthProvider'
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from '../../server/HttpErrors'
import { TUserTokenInfo } from '../../server/User'
import { AUTH_PROVIDER } from "../AuthProvider"
import { JsonHelper } from "../../lib/JsonHelper"


//
enum OIDC_ERROR_MESSAGE {
    NOT_INITIALIZED = 'OIDC client not initialized'
}

export type TOidcAuthConfig = {
    provider: AUTH_PROVIDER.OIDC
    issuer: string
    "client-id": string
    "client-secret": string
    scope?: string
    "roles-path"?: string
}

const DEFAULT_SERVER_AUTHENTICATION_OIDC: Partial<TOidcAuthConfig> = {
    scope: "openid roles",
    "roles-path": "realm_access.roles"
}


//
export class OidcAuth extends absAuthProvider {

    #OidcClient: Client | null = null
    #Config: TOidcAuthConfig | undefined = undefined
    readonly #TokenCache: Map<string, TokenSet> = new Map()

    GetUsers() {
        // Since Oidc users are managed externally, return empty object
        return {}
    }

    @Logger.LogFunction()
    async Init(): Promise<void> {
        //FIXME workaround for SSL/TLS errors
        // file deepcode ignore InsecureTLSConfig: Workround
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

        this.#Config = <TOidcAuthConfig>_.merge(
            DEFAULT_SERVER_AUTHENTICATION_OIDC,
            Config.Configuration.server?.authentication
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
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Failed to initialize OIDC Authentication: ${error.message}`)
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

            const userRoles: string[] = JsonHelper.Get(userInfo, this.#Config["roles-path"]) ?? []

            // const decodedToken = jwt.decode(tokenSet.access_token!) as JwtPayload
            const roles = _.intersection(
                userRoles,
                Object.keys(Config.Configuration?.roles ?? {})
            )

            return {
                user: username,
                roles
            }

        } catch (error: any) {
            throw new HttpErrorUnauthorized(`Authentication failed: ${error.message}`)
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
        } catch (error: any) {
            Logger.Error(`Error during logout for user ${username}: ${error.message}`)
        }
    } 
}