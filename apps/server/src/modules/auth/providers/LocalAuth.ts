//
//
//

import { Logger } from "@metal/logger"
import bcrypt from "bcryptjs"
import * as _ from "lodash-es"
//
import { Assert } from "../../../utils/Assert"
import { ConfigManager } from "../../core/ConfigManager"
import type { U__users, U__users_user } from "../../core/types/U__users"
import { HttpErrorInternalServerError, HttpErrorUnauthorized } from "../../errors/HttpErrors"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from "../base/absAuthProvider"


//
export class LocalAuth extends absAuthProvider {
	readonly _SALT_ROUNDS = 10
	_users: U__users = {}

	_hashPassword(password: string): string {
		return bcrypt.hashSync(password, this._SALT_ROUNDS)
	}

	GetUsers() {
		return this._users
	}

	@Logger.LogFunction()
	Init(): void {
		if (!ConfigManager.Get<U__users | undefined>("users"))
			throw new HttpErrorInternalServerError("users configuration is not set")

		// convert password to string
		this._users = _.mapValues(ConfigManager.Get<U__users>("users"), (user) => ({
			...user,
			password: String(user.password),
		}))
	}

	@Logger.LogFunction(true)
	async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
		const { username, password } = userCredentials

		const userInfo = this._users[username] ?? undefined

		Assert.Var<U__users_user>(userInfo, "Invalid username or password", new HttpErrorUnauthorized())
		Assert.Condition(
			bcrypt.compareSync(password, this._hashPassword(userInfo.password.toString())),
			"Invalid username or password",
			new HttpErrorUnauthorized(),
		)

		return <TUserTokenInfo>{
			user: username,
			roles: userInfo.roles,
		}
	}

	@Logger.LogFunction()
	async LogOut(username: string): Promise<void> {
		Logger.Debug(`User ${username} logged out`)
	}
}
