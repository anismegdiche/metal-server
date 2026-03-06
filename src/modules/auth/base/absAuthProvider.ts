//
//
//
//
import type { U_config_users } from "../../core/types/U_config_users"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import type { IAuthProvider } from "./IAuthProvider"

//
export abstract class absAuthProvider implements IAuthProvider {
	//NOSONAR
	abstract Init(): void
	abstract GetUsers(): U_config_users
	abstract Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
	abstract LogOut(username: string): Promise<void>
}
