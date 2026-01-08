//
//
//

import chokidar from "chokidar"
import type { FSWatcher } from "chokidar"
import type { TJson } from "../../types/TJson"
import { Logger } from "../../utils/Logger"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { Cache } from "../cache/Cache"
import { ServerShutdown } from './ServerShutdown'
import { Schedule } from "../plan/Schedule"
import type { TInternalResponse } from "./types/TInternalResponse"
import { Source } from "../source/Source"
import { SERVER } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { ConfigStore } from "./ConfigStore"
import { HttpResponse } from "./HttpResponse"

//
export class ServerRuntime {

    private static configWatcher?: FSWatcher

    @Logger.LogFunction()
    static async Stop(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

        const { ServerShutdown } = await import('./ServerShutdown')
        await ServerShutdown.Shutdown('MANUAL_STOP')

        return HttpResponse.Ok({
            message: 'Server stopped'
        })
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
        this.configWatcher = chokidar.watch(ConfigManager.ConfigFilePath).on('change', () => {
            Logger.Info('Config file changed. Reloading...')
            ServerRuntime.Reload()
                .catch((err: Error) => Logger.Error(err.message))
        })

        // Register watcher for shutdown
        ServerShutdown.RegisterConfigWatcher(this.configWatcher)
    }

}
