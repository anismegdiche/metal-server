// // OktaAuth.ts
// import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
// import { Logger } from "../../utils/Logger"
// import { Config } from "../../server/Config"
// import axios from "axios"
// import { TConfigUsers } from "../../types/TConfig"
// import { TUserTokenInfo } from "../../server/User"


// //
// export type TOktaAuthConfig = {
//     oktaDomain: string
//     oktaClientId: string
//     oktaClientSecret: string
//     oktaRedirectUri: string

// }

// export class OktaAuth extends ACAuthProvider {
//     GetUsers(): TConfigUsers {
//         throw new Error("Method not implemented.")
//     }
//     Init(): void {
//         // Initialization logic if needed
//     }

//     async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
//         const { username, password } = userCredentials

//         const response = await axios.post(`${Config.Configuration.okta.url}/api/v1/authn`, {
//             username,
//             password
//         })

//         if (response.data.status !== 'SUCCESS') {
//             throw new Error("Authentication failed")
//         }

//         return {
//             user: username,
//             roles: response.data._embedded.user.profile.roles || []
//         }
//     }

//     async LogOut(username: string): Promise<void> {
//         Logger.Debug(`User ${username} logged out`)
//     }
// }