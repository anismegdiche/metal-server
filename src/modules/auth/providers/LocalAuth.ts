//
//
//
import bcrypt from "bcryptjs"
import * as _ from 'lodash-es'
import z from "zod"
//
import { Assert } from "../../../utils/Assert"
import { Logger } from "../../../utils/Logger"
import { ConfigManager } from "../../core/ConfigManager"
import type { U_config_users, U_config_users_user } from "../../core/types/U_config_users"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import { AUTH_PROVIDER } from "../@consts"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from "../base/absAuthProvider"


//
export const z_U_config_server_authentication_local = z.object({
    provider: z.literal(AUTH_PROVIDER.LOCAL)
});


//
export type U_config_server_authentication_local = z.infer<typeof z_U_config_server_authentication_local>


//
export class LocalAuth extends absAuthProvider {

    readonly _SALT_ROUNDS = 10
    _users: U_config_users = {}

    _hashPassword(password: string): string {
        return bcrypt.hashSync(password, this._SALT_ROUNDS)
    }

    GetUsers() {
        return this._users
    }

    @Logger.LogFunction()
    Init(): void {
        if (!ConfigManager.Get<U_config_users | undefined>('users'))
            throw new HttpErrorInternalServerError("users configuration is not set")

        // convert password to string
        this._users = _.mapValues(ConfigManager.Get<U_config_users>('users'), (user) => ({
            ...user,
            password: String(user.password)
        }))
    }

    async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        const { username, password } = userCredentials

        const userInfo = this._users[username] ?? undefined

        Assert.Var<U_config_users_user>(userInfo, 'Invalid username or password', new HttpErrorUnauthorized())
        Assert.Condition(bcrypt.compareSync(password, this._hashPassword(userInfo.password.toString())), 'Invalid username or password', new HttpErrorUnauthorized())

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
