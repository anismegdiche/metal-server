//
//
//
import type { U__users } from "../../core/types/U__users"
import type { TUserCredentials, TUserTokenInfo } from "../@types"

//
export interface IAuthProvider {
	Init(): void
	GetUsers(): U__users
	Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
	LogOut(username: string): Promise<void>
}
