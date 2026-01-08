//
//
//
import type { U_config_users } from "../../core/types/U_config_users"
import type { TUserCredentials, TUserTokenInfo } from "../@types"

//
export interface IAuthProvider {
    Init(): void
    GetUsers(): U_config_users
    Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
    LogOut(username: string): Promise<void>
}
