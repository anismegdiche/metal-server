//
//
//
import z from "zod"
//
import { Logger } from "../../../utils/Logger"
import type { U_config_users } from "../../core/types/U_config_users"
import { AUTH_PROVIDER } from "../@consts"
import type { TUserCredentials, TUserTokenInfo } from "../@types"
import { absAuthProvider } from "../base/absAuthProvider"


//
export const z_U_config_server_authentication_demo = z.object({
    provider: z.literal(AUTH_PROVIDER.DEMO),
});


//
export type U_config_server_authentication_demo = z.infer<typeof z_U_config_server_authentication_demo>;


//
export class DemoAuth extends absAuthProvider {

    Init(): void {
        Logger.Debug("DemoAuthProvider.Init")
    }

    GetUsers(): U_config_users {
        return {
            "admin": {
                password: "password",// NOSONAR
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