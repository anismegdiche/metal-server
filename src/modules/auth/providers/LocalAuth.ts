//
//
//
import bcrypt from "bcryptjs"
import _ from "lodash"
//
import { Logger } from "../../../utils/Logger"
import { absAuthProvider } from "../base/absAuthProvider"
import { TUserCredentials, TUserTokenInfo } from "../@types"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import { TConfigUsers } from "../../core/types/TConfigUsers"
import { ConfigManager } from "../../core/ConfigManager"


//
export class LocalAuth extends absAuthProvider {

    readonly #SALT_ROUNDS = 10
    #Users: TConfigUsers = {}

    #HashPassword(password: string): string {
        return bcrypt.hashSync(password, this.#SALT_ROUNDS)
    }

    GetUsers() {
        return this.#Users
    }

    @Logger.LogFunction()
    Init(): void {
        if (!ConfigManager.Get<TConfigUsers | undefined>('users'))
            throw new HttpErrorInternalServerError("users configuration is not set")

        // convert password to string
        this.#Users = _.mapValues(ConfigManager.Get<TConfigUsers>('users'), (user) => ({
            ...user,
            password: String(user.password)
        }))
    }

    async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        const { username, password } = userCredentials

        const userInfo = this.#Users[username] ?? undefined

        if (!userInfo) {
            throw new HttpErrorUnauthorized("Invalid username or password")
        }

        if (!bcrypt.compareSync(password, this.#HashPassword(this.#Users[username].password.toString()))) {
            throw new HttpErrorUnauthorized("Invalid username or password")
        }

        return <TUserTokenInfo>{
            user: username,
            roles: userInfo.roles
        }
    }

    @Logger.LogFunction()
     
    async LogOut(username: string): Promise<void> {
        Logger.Debug(`User ${username} logged out`)
    }
}
