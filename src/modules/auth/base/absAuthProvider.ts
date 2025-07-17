//
//
//
//
import { TConfigUsers } from "../../core/types/TConfigUsers"
import { TUserCredentials, TUserTokenInfo } from "../@types"
import { IAuthProvider } from "./IAuthProvider"


//
export abstract class absAuthProvider implements IAuthProvider { //NOSONAR
    abstract Init(): void
    abstract GetUsers(): TConfigUsers
    abstract Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo>
    abstract LogOut(username: string): Promise<void>
}
