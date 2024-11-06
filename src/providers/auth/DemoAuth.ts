//
//
//
//
//
import typia from "typia"
//
import { Logger } from "../../utils/Logger"
import { ACAuthProvider, TUserCredentials } from "../ACAuthProvider"
import { TUsersList } from "./BasicAuth"


//
export class DemoAuthProvider extends ACAuthProvider {

    // eslint-disable-next-line class-methods-use-this
    Init(): void {
        Logger.Debug("DemoAuthProvider.Init")
    }

    // eslint-disable-next-line class-methods-use-this
    GetUsers() {
        return typia.random<TUsersList>()
    }

    // eslint-disable-next-line class-methods-use-this, unused-imports/no-unused-vars
    IsUserExist(username: string): boolean {
        return true
    }

    // eslint-disable-next-line class-methods-use-this, unused-imports/no-unused-vars
    async Authenticate(userCredentials: TUserCredentials): Promise<void> {
        Logger.Debug("DemoAuthProvider.Authenticate")
    }

    // eslint-disable-next-line class-methods-use-this, unused-imports/no-unused-vars
    async LogOut(username: string): Promise<void> {
        Logger.Debug("DemoAuthProvider.LogOut")
    }

}