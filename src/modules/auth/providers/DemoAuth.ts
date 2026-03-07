//
//
//
import z from "zod"
//
import { Logger } from "../../../utils/Logger"
import type { U__users } from "../../core/types/U__users"
import { AUTH_PROVIDER } from "../@consts"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from "../base/absAuthProvider"

import {
	type U__server_authentication_demo,
	z_U__server_authentication_demo,
} from "../types/U__server_authentication_demo"

//
export class DemoAuth extends absAuthProvider {
	Init(): void {
		Logger.Debug("DemoAuthProvider.Init")
	}

	GetUsers(): U__users {
		return {
			admin: {
				password: "password", // NOSONAR
				roles: ["admin"],
			},
		}
	}

	async Authenticate(_userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
		Logger.Debug("DemoAuthProvider.Authenticate")
		return {
			user: _userCredentials.username,
			roles: ["admin"],
		}
	}

	async LogOut(_username: string): Promise<void> {
		Logger.Debug("DemoAuthProvider.LogOut")
	}
}
