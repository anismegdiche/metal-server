//
//
//
//
//
import typia from "typia"
//
import { Logger } from "../../utils/Logger"
import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
import { TUserTokenInfo } from "../../server/User"
import { TConfigUsers } from "../../types/TConfig"


//
export class DemoAuthProvider extends ACAuthProvider {

    // eslint-disable-next-line class-methods-use-this
    Init(): void {
        Logger.Debug("DemoAuthProvider.Init")
    }

    // eslint-disable-next-line class-methods-use-this
    GetUsers() {
        return typia.random<TConfigUsers>()
    }

    // eslint-disable-next-line class-methods-use-this, unused-imports/no-unused-vars
    async Authenticate(userCredentials: TUserCredentials): Promise<TUserTokenInfo> {
        Logger.Debug("DemoAuthProvider.Authenticate")
        return typia.random<TUserTokenInfo>()
    }

    // eslint-disable-next-line class-methods-use-this, unused-imports/no-unused-vars
    async LogOut(username: string): Promise<void> {
        Logger.Debug("DemoAuthProvider.LogOut")
    }

}