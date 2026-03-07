//
//
//
//
import type { U__users } from "../../core/types/U__users"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import type { IAuthProvider } from "./IAuthProvider"

//
export abstract class absAuthProvider implements IAuthProvider {
	//NOSONAR
	abstract Init(): void
	abstract GetUsers(): U__users
	abstract Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
	abstract LogOut(username: string): Promise<void>
}
