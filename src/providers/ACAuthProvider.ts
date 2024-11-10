//
//
//
//
import { TUserTokenInfo } from "../server/User"
import { TConfigUsers } from "../types/TConfig"


//
export type TUserCredentials = {
    username: string
    password: string
}


//
export abstract class ACAuthProvider {
    abstract Init(): void
    abstract GetUsers(): TConfigUsers
    abstract Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
    abstract LogOut(username: string): Promise<void>
}