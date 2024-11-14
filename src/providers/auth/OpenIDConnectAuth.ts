// import { Issuer, Client, TokenSet } from 'openid-client'
// import _ from 'lodash'

// import { Logger } from '../../utils/Logger'
// import { Config } from '../../server/Config'
// import { ACAuthProvider, TUserCredentials } from '../ACAuthProvider'
// import { HttpErrorInternalServerError, HttpErrorUnauthorized } from '../../server/HttpErrors'
// import { TUserTokenInfo } from '../../server/User'

// export type TOpenIdConnectAuthConfig = {
//     issuer: string
//     clientId: string
//     clientSecret: string
//     redirectUri: string
//     scope: string
// }

// export class OIDCAuth extends ACAuthProvider {
//     #oidcClient: Client | null = null
//     #tokenCache: Map<string, TokenSet> = new Map()

//     #Config: TOpenIdConnectAuthConfig | undefined = undefined

//     constructor() {
//         super()
//         this.#Config = Config.Configuration.server?.authentication
//     }

//     GetUsers() {
//         // Since OIDC users are managed externally, return empty object
//         return {}
//     }

//     @Logger.LogFunction()
//     async Init(): Promise<void> {
//         if (!this.#Config) {
//             throw new HttpErrorInternalServerError('OIDC configuration is not set')
//         }

//         try {
//             const issuer = await Issuer.discover(this.#Config.issuer)
//             this.#oidcClient = new issuer.Client({
//                 client_id: this.#Config.clientId,
//                 client_secret: this.#Config.clientSecret,
//                 redirect_uris: [this.#Config.redirectUri],
//                 response_types: ['code']
//             })
//         } catch (error: any) {
//             throw new HttpErrorInternalServerError(`Failed to initialize OIDC client: ${error.message}`)
//         }
//     }

//     async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
//         if (!this.#oidcClient || !this.#Config) {
//             throw new HttpErrorInternalServerError('OIDC client not initialized')
//         }

//         // const { code, state } = userCredentials

//         try {
//             const tokenSet = await this.#oidcClient.callback(
//                 this.#Config.redirectUri,
//                 {
//                     code,
//                     state
//                 }
//             )

//             const userInfo = await this.#oidcClient.userinfo(tokenSet)

//             // Cache the token for later use (e.g., logout)
//             this.#tokenCache.set(userInfo.sub, tokenSet)

//             // Extract roles from userInfo claims
//             const roles: string[] = _.get(userInfo, 'roles', []) ?? []

//             return {
//                 user: userInfo.sub,
//                 roles: roles
//             }
//         } catch (error: any) {
//             throw new HttpErrorUnauthorized(`Authentication failed: ${error.message}`)
//         }
//     }

//     async LogOut(username: string): Promise<void> {
//         if (!this.#oidcClient) {
//             throw new HttpErrorInternalServerError('OIDC client not initialized')
//         }

//         try {
//             const tokenSet = this.#tokenCache.get(username)
//             if (tokenSet) {
//                 // Perform end_session at the OIDC provider
//                 await this.#oidcClient.revoke(tokenSet.access_token!)
//                 this.#tokenCache.delete(username)
//             }
//             Logger.Debug(`User ${username} logged out`)
//         } catch (error: any) {
//             Logger.Error(`Error during logout for user ${username}: ${error.message}`)
//         }
//     }

//     // Helper method to generate authorization URL
//     getAuthorizationUrl(state: string): string {
//         if (!this.#oidcClient || !this.#Config) {
//             throw new HttpErrorInternalServerError('OIDC client not initialized')
//         }

//         return this.#oidcClient.authorizationUrl({
//             scope: this.#Config.scope,
//             state
//         })
//     }
// }