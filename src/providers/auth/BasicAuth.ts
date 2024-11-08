//
//
//
//
//
import Bcrypt from 'bcrypt'
import _ from "lodash"
//
import { Logger } from "../../utils/Logger"
import { Config } from "../../server/Config"
import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../server/HttpErrors"
import { TUserTokenInfo } from "../../server/User"
import { TConfigUsers } from "../../types/TConfig"


//
export class BasicAuthProvider extends ACAuthProvider {

    readonly #SALT_ROUNDS = 10
    #Users: TConfigUsers = {}

    #HashPassword(password: string): string {
        return Bcrypt.hashSync(password, this.#SALT_ROUNDS)
    }

    GetUsers() {
        return this.#Users
    }

    @Logger.LogFunction()

    Init(): void {
        if (!Config.Configuration.users)
            throw new HttpErrorInternalServerError("users configuration is not set")

        // convert password to string
        this.#Users = _.mapValues(Config.Configuration.users, (user) => ({
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

        if (!Bcrypt.compareSync(password, this.#HashPassword(this.#Users[username].password.toString()))) {
            throw new HttpErrorUnauthorized("Invalid username or password")
        }

        return <TUserTokenInfo>{
            user: username,
            roles: userInfo.roles
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async LogOut(username: string): Promise<void> {
        Logger.Debug(`User ${username} logged out`)
    }
}
