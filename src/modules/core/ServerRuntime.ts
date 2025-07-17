//
//
//

import chokidar from "chokidar"
import { TJson } from "../../types/TJson"
import { Logger } from "../../utils/Logger"
import { AUTH_PERMISSION } from "../auth/@consts"
import { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { Cache } from "../cache/Cache"
import { HttpErrorNotImplemented } from "../errors/HttpErrors"
import { Schedule } from "../plan/Schedule"
import { TInternalResponse } from "../schema/types/TInternalResponse"
import { Source } from "../source/Source"
import { SERVER } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { ConfigStore } from "./ConfigStore"
import { HttpResponse } from "./HttpResponse"

//
export class ServerRuntime {

    @Logger.LogFunction()
    static Stop() {
        throw new HttpErrorNotImplemented()
    }

    //FIXME server reload: not work to correct
    //BUG server reload: error in plan DataProvider
    @Logger.LogFunction()
    static async Reload(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        Schedule.StopAll()
        await Cache.Disconnect()
        await Source.DisconnectAll()
        await ConfigManager.Init(new ConfigStore())
        return HttpResponse.Ok({
            message: `Server reloaded`
        })
    }

    @Logger.LogFunction()
    static async GetInfo(): Promise<TInternalResponse<TJson>> {
        return HttpResponse.Ok({
            server: SERVER.NAME,
            version: SERVER.VERSION
        })
    }

    @Logger.LogFunction()
    static StartWatcher(): void {

        // Config
        chokidar.watch(ConfigManager.ConfigFilePath).on('change', () => {
            Logger.Info('Config file changed. Reloading...')
            ServerRuntime.Reload()
                .catch((err: Error) => Logger.Error(err.message))
        })
    }

}