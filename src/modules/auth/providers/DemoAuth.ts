//
//
//
//
//
import { Logger } from "../../../utils/Logger"
import { absAuthProvider } from "../base/absAuthProvider"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import type { U_config_users } from "../../core/types/U_config_users"


//
export class DemoAuth extends absAuthProvider {

    Init(): void {
        Logger.Debug("DemoAuthProvider.Init")
    }

    GetUsers(): U_config_users {
        return {
            "admin": {
                password: "password",
                roles: ["admin"]
            }
        }
    }

    async Authenticate(_userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        Logger.Debug("DemoAuthProvider.Authenticate")
        return {
            user: _userCredentials.username,
            roles: ["admin"]
        }
    }

    async LogOut(_username: string): Promise<void> {
        Logger.Debug("DemoAuthProvider.LogOut")
    }
}