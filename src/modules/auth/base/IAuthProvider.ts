//
//
//
import { TConfigUsers } from "../../core/types/TConfigUsers"
import { TUserCredentials, TUserTokenInfo } from "../@types"

//
export interface IAuthProvider {
    Init(): void
    GetUsers(): TConfigUsers
    Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
    LogOut(username: string): Promise<void>
}
