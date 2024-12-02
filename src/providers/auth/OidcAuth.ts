//
//
//
//
//
import { Issuer, Client, TokenSet } from "openid-client"
import _ from 'lodash'
import jwt, { JwtPayload } from 'jsonwebtoken'
//
import { Logger } from '../../utils/Logger'
import { Config } from '../../server/Config'
import { absAuthProvider, TUserCredentials } from '../absAuthProvider'
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from '../../server/HttpErrors'
import { TUserTokenInfo } from '../../server/User'


//
enum OIDC_ERROR_MESSAGE {
    NOT_INITIALIZED =  'OIDC client not initialized'
}

//
export type TOidcAuthConfig = {
    issuer: string
    "client-id": string
    "client-secret": string
    //TODO: not used
    redirectUri?: string
    //TODO: not used
    scope?: string
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
        this.#Config = Config.Configuration.server?.authentication

        if (!this.#Config)
            throw new HttpErrorInternalServerError(OIDC_ERROR_MESSAGE.NOT_INITIALIZED)

        try {
            const oidcIssuer = await Issuer.discover(this.#Config.issuer)
            this.#OidcClient = new oidcIssuer.Client({
                client_id: this.#Config['client-id'],
                client_secret: this.#Config["client-secret"],
                response_types: ['code']
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
                scope: "openid roles"
            })
            this.#TokenCache.set(username, tokenSet)
            const decodedToken = jwt.decode(tokenSet.access_token as string) as JwtPayload
            const roles = _.intersection(
                decodedToken.realm_access?.roles || [],
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
                // Perform end_session at the OIDC provider
                await this.#OidcClient.revoke(tokenSet.access_token!)
                this.#TokenCache.delete(username)
            }
            Logger.Debug(`User ${username} logged out`)
        } catch (error: any) {
            Logger.Error(`Error during logout for user ${username}: ${error.message}`)
        }
    }
}