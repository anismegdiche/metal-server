//
//
//
//

import { TUserTokenInfo } from "../server/User"

//
export type TUserCredentials = {
    username: string
    password: string
}

//
export abstract class ACAuthProvider {
    abstract Init(): void
    abstract GetUsers(): any
    abstract Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
    abstract LogOut(username: string): Promise<void>
}