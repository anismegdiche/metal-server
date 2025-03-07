//
//
//
//
//
import express, { Express, NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import responseTime from 'response-time'
import chokidar from 'chokidar'
import helmet from "helmet"
import os from 'node:os'
//
import { TJson } from '../types/TJson'
import { HTTP_STATUS_CODE, ROUTE, SERVER } from '../lib/Const'
import { LoggerDefaultLevel, Logger } from '../utils/Logger'
import { Config } from './Config'
import { Source } from './Source'
import { Cache } from '../server/Cache'
import { Schedule } from './Schedule'
import { UserRouter } from '../routes/UserRouter'
import { ServerRouter } from '../routes/ServerRouter'
import { SchemaRouter } from '../routes/SchemaRouter'
import { PlanRouter } from '../routes/PlanRouter'
import { CacheRouter } from '../routes/CacheRouter'
import { ScheduleRouter } from '../routes/ScheduleRouter'
import { JsonHelper } from '../lib/JsonHelper'
import { HttpErrorNotImplemented } from "./HttpErrors"
import { Swagger } from '../utils/Swagger'
import { TInternalResponse } from "../types/TInternalResponse"
import { HttpResponse } from "./HttpResponse"
import { AUTH_PROVIDER, AuthProvider } from "../providers/AuthProvider"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"
import { ContentProvider } from "../providers/ContentProvider"
import { StorageProvider } from "../providers/StorageProvider"
import { DataProvider } from "../providers/DataProvider"
import { WebServiceProvider } from "../providers/WebServiceProvider"
import { AiEngine } from "./AiEngine"
import { Plans } from "./Plans"
import { Convert } from "../lib/Convert"


//
export class Server {

    static readonly App: Express = express()
    static Port: number  //NOSONAR
    static CurrentPath: string  //NOSONAR

    static readonly Cpus = os.cpus().length ?? 1

    @Logger.LogFunction()
    static async Init(): Promise<void> {

        // core
        Server.RegisterProviders()
        
        // config
        await Config.Init()

        // sources
        await Source.Init()
        
        // cache
        Cache.Init()
        await Cache.Connect()
        
        await AiEngine.Init()
        
        // plans
        Plans.Init()
        Schedule.Init()


        Server.InitLogging()
        Server.InitAuthentication()

        Server.InitResponse()
        Server.InitApi()
        Server.StartWatcher()
    }

    static InitApi() {
        Server.Port = Config.Get<number>("server.port")

        Server.App.use(helmet())

        Server.App.use(responseTime())
        Server.App.use(Logger.RequestMiddleware)
        Server.App.use(rateLimit(Config.Get<object>("server.response-rate")))

        Server.App.use(express.json({
            limit: Config.Get<string | number>("server.request-limit")
        }))

        Server.App.use((req: Request, res: Response, next: NextFunction) => {
            res.setHeader('X-Powered-By', 'Metal')
            next()
        })

        Swagger.Load()
        Swagger.StartUi(Server.App)
        Swagger.Validator(Server.App)

        // path: /
        Server.App.get('/', (req: Request, res: Response) => {
            res.status(HTTP_STATUS_CODE.OK).send(SERVER.BANNER)
        })

        // path: /user
        if (Config.Flags.EnableAuthentication) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.USER_PATH}`)
            Server.App.use(`${ROUTE.USER_PATH}/`, Server.SetContentJson, UserRouter)
        }

        // path: /server
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SERVER_PATH}`)
        Server.App.use(`${ROUTE.SERVER_PATH}/`, Server.SetContentJson, ServerRouter)

        // path: /schema
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEMA_PATH}`)
        Server.App.use(`${ROUTE.SCHEMA_PATH}/`, Server.SetContentJson, SchemaRouter)

        // path: /plan
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.PLAN_PATH}`)
        Server.App.use(`${ROUTE.PLAN_PATH}/`, Server.SetContentJson, PlanRouter)

        // path: /cache
        if (Cache.IsEnabled) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.CACHE_PATH}`)
            Server.App.use(`${ROUTE.CACHE_PATH}/`, Server.SetContentJson, CacheRouter)
        }

        // path: /schedule
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEDULE_PATH}`)
        Server.App.use(`${ROUTE.SCHEDULE_PATH}/`, Server.SetContentJson, ScheduleRouter)

        // path: /api-docs
        Logger.Info(`Route: Enabling Swagger UI, URL= ${ROUTE.SWAGGER_UI_PATH}`)

        // error handler
        Server.App.use((err: any, req: Request, res: Response, _next: NextFunction) => {
            // format error
            res.status(err.Status || err.status || 500).json({
                message: err.message,
                errors: err.errors
            })
        })
    }

    @Logger.LogFunction()
    static Start() {
        // Start Server
        Server.App
            .listen(
                Server.Port,
                () => {
                    Logger.Message(SERVER.CONSOLE_BANNER)
                    Logger.Message(`Metal server started on port ${Server.Port}`)
                    Logger.Message(`version: ${SERVER.VERSION}`)
                })
            .on('error', (error: Error & { code?: string }) => {
                if (error.code === 'EADDRINUSE') {
                    Logger.Error(`Port ${Server.Port} is already in use. Exiting the process.`)
                    process.exit(1)
                } else {
                    Logger.Error(`An error occurred: ${JsonHelper.Stringify(error)}`)
                }
            })
    }

    @Logger.LogFunction()
    static Stop() {
        throw new HttpErrorNotImplemented()
    }

    //CURRENT server reload: not work to correct
    @Logger.LogFunction()
    static async Reload(userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
        Roles.CheckPermission(userToken, undefined, PERMISSION.ADMIN)

        Schedule.StopAll()
        await Cache.Disconnect()
        await Source.DisconnectAll()
        await Config.Init()
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

    static SetContentJson(req: Request, res: Response, next: NextFunction) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        next()
    }

    @Logger.LogFunction()
    static StartWatcher(): void {

        // Config
        chokidar.watch(Config.ConfigFilePath).on('change', () => {
            Logger.Info('Config file changed. Reloading...')
            Server.Reload()
                .catch((err: Error) => Logger.Error(err.message))
        })
    }

    static RegisterProviders() {
        AuthProvider.RegisterProviders()
        StorageProvider.RegisterProviders()
        WebServiceProvider.RegisterProviders()
        ContentProvider.RegisterProviders()
        DataProvider.RegisterProviders()
    }

    @Logger.LogFunction()
    static InitLogging(): void {
        const verbosity = Config.Configuration.server?.verbosity ?? LoggerDefaultLevel
        Logger.SetLevel(verbosity)
    }

    @Logger.LogFunction()
    static InitAuthentication(): void {
        Config.Flags.EnableAuthentication = (Config.Configuration.server?.authentication !== undefined)

        const {
            provider = AUTH_PROVIDER.LOCAL
        } = Config.Configuration.server?.authentication ?? {}

        AuthProvider.SetCurrent(provider)
        if (Config.Flags.EnableAuthentication) {
            AuthProvider.Provider.Init()
            Roles.Init()
        }
    }

    @Logger.LogFunction()
    static InitResponse(): void {
        Config.Flags.ResponseLimit = Convert.HumainSizeToBytes(Config.Get("server.response-limit"))
        Config.Flags.EnableResponseChunk = Config.Get<boolean>('server.response-chunk')
        Logger.Debug(`Server Response Limit set to ${Config.Flags.ResponseLimit}`)
    }
}
