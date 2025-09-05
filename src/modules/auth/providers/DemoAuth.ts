//
//
//
import typia from "typia"
//
import { Logger } from "../../../utils/Logger"
import { absAuthProvider } from "../base/absAuthProvider"
import { TUserCredentials , TUserTokenInfo } from "../@types"
import { TConfigUsers } from "../../core/types/TConfigUsers"


//
export class DemoAuth extends absAuthProvider {
     
    Init(): void {
        Logger.Debug("DemoAuthProvider.Init")
    }
     
    GetUsers() {
        return typia.random<TConfigUsers>()
    }

    async Authenticate(_userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        Logger.Debug("DemoAuthProvider.Authenticate")
        return typia.random<TUserTokenInfo>()
    }

    async LogOut(_username: string): Promise<void> {
        Logger.Debug("DemoAuthProvider.LogOut")
    }
}