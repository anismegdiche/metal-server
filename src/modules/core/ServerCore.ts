//
//
//
import { LogLevelDesc } from 'loglevel'
import os from 'node:os'
//
import { Convert } from "../../utils/Convert"
import { Logger } from '../../utils/Logger'
//
//
import { AuthProvider } from '../auth/AuthProvider'
import { Roles } from '../auth/Roles'
import { TAuthentication } from '../auth/types/TAuthentication'
import { Cache } from '../cache/Cache'
import { ContentProvider } from '../content/ContentProvider'
import { Plans } from '../plan/Plans'
import { Schedule } from '../plan/Schedule'
import { Schema } from '../schema/Schema'
import { DataProvider } from '../source/DataProvider'
import { Source } from '../source/Source'
import { StorageProvider } from '../storage/StorageProvider'
import { WebServiceProvider } from '../webservice/WebServiceProvider'
import { ConfigManager } from './ConfigManager'
import { ConfigStore } from './ConfigStore'
import { ServerEndpoint } from './ServerEndpoint'
import { ServerRuntime } from './ServerRuntime'
import { AiEngine } from '../ai-engine/AiEngine'
//


//
export class ServerCore {

    static CurrentPath: string  //NOSONAR
    static readonly Cpus = os.cpus().length ?? 1
    static readonly Platform = process.platform


    @Logger.LogFunction()
    static async Init(): Promise<void> {

        // core
        ServerCore.RegisterProviders()

        // config
        await ConfigManager.Init(new ConfigStore())
        ServerCore.InitLogging()

        // schema
        Schema.Init(Cache.Get)

        // sources
        await Source.Init()

        // cache
        await Cache.Init(DataProvider.GetProvider)
        await Cache.Connect()

        await AiEngine.Init()

        // plans
        Plans.Init()
        Schedule.Init()


        ServerCore.InitAuthentication()

        ServerCore.InitResponse()
        ServerEndpoint.InitApi()
        ServerRuntime.StartWatcher()
    }

    static RegisterProviders() {
        AuthProvider.RegisterProviders()
        StorageProvider.RegisterProviders()
        WebServiceProvider.RegisterProviders()
        ContentProvider.RegisterProviders()
        DataProvider.RegisterProviders()
        AiEngine.RegisterProviders()
    }

    @Logger.LogFunction()
    static InitLogging(): void {
        const verbosity = ConfigManager.Get<LogLevelDesc>("server.verbosity")
        Logger.SetLevel(verbosity)
    }

    @Logger.LogFunction()
    static InitAuthentication(): void {
        const authentication = ConfigManager.Get<TAuthentication>("server.authentication")
        AuthProvider.SetCurrent(authentication.provider)
        AuthProvider.Provider.Init()
        Roles.Init()
    }

    @Logger.LogFunction()
    static InitResponse(): void {
        Logger.Debug(`Server Response Limit set to ${Convert.HumainSizeToBytes(ConfigManager.Get("server.response-limit"))}`)
    }
}
