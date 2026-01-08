//
//
//
import bcrypt from "bcryptjs"
import * as _ from 'lodash-es'
//
import { Logger } from "../../../utils/Logger"
import { absAuthProvider } from "../base/absAuthProvider"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import type { U_config_users_user, U_config_users } from "../../core/types/U_config_users"
import { ConfigManager } from "../../core/ConfigManager"
import { Assert } from "../../../utils/Assert"


//
export class LocalAuth extends absAuthProvider {

    readonly #SALT_ROUNDS = 10
    #Users: U_config_users = {}

    #HashPassword(password: string): string {
        return bcrypt.hashSync(password, this.#SALT_ROUNDS)
    }

    GetUsers() {
        return this.#Users
    }

    @Logger.LogFunction()
    Init(): void {
        if (!ConfigManager.Get<U_config_users | undefined>('users'))
            throw new HttpErrorInternalServerError("users configuration is not set")

        // convert password to string
        this.#Users = _.mapValues(ConfigManager.Get<U_config_users>('users'), (user) => ({
            ...user,
            password: String(user.password)
        }))
    }

    async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        const { username, password } = userCredentials

        const userInfo = this.#Users[username] ?? undefined

        Assert.Var<U_config_users_user>(userInfo, 'Invalid username or password', new HttpErrorUnauthorized())
        Assert.Condition(bcrypt.compareSync(password, this.#HashPassword(userInfo.password.toString())), 'Invalid username or password', new HttpErrorUnauthorized())

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
