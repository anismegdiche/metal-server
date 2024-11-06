//
//
//
//

//
export type TUserCredentials = {
    username: string
    password: string
}

//
export abstract class ACAuthProvider {
    abstract Init(): void
    abstract GetUsers(): any
    abstract IsUserExist(username: string): boolean
    abstract Authenticate(userCredentials: TUserCredentials): Promise<void>
    abstract LogOut(username: string): Promise<void>
}