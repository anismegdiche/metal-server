// // AzureADAuth.ts
// import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
// import { Logger } from "../../utils/Logger"
// import { Config } from "../../server/Config"
// import * as msal from "@azure/msal-node"
// import { TConfigUsers } from "../../types/TConfig"
// import { TUserTokenInfo } from "../../server/User"


// //
// export type TAzureAdAuthConfig = {
//     clientId: string
//     clientSecret: string
//     tenantId: string
// }


// //
// export class AzureAdAuth extends ACAuthProvider {
//     GetUsers(): TConfigUsers {
//         throw new Error("Method not implemented.")
//     }
//     private msalClient: msal.ConfidentialClientApplication | undefined

//     Init(): void {
//         const config = {
//             auth: {
//                 clientId: Config.Configuration.server?.authentication.clientId ?? "",
//                 authority: `https://login.microsoftonline.com/${Config.Configuration.server?.authentication.tenantId}`,
//                 clientSecret: Config.Configuration.server?.authentication.clientSecret
//             }
//         }
//         this.msalClient = new msal.ConfidentialClientApplication(config)
//     }

//     async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
//         const { username, password } = userCredentials
//         if (this.msalClient === undefined) {
//             throw new Error("Authentication failed")
//         }
//         const tokenResponse = await this.msalClient.acquireTokenByUsernamePassword({
//             scopes: ["user.read"],
//             username,
//             password
//         })

//         if (!tokenResponse) {
//             throw new Error("Authentication failed")
//         }

//         return {
//             user: username,
//             roles: tokenResponse.scopes
//         }
//     }

//     async LogOut(username: string): Promise<void> {
//         Logger.Debug(`User ${username} logged out`)
//     }
// }