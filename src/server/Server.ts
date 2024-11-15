//
//
//
//
//
import express, { Express, NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import responseTime from 'response-time'
import chokidar from 'chokidar'
//
import { TJson } from '../types/TJson'
import { HTTP_STATUS_CODE, ROUTE, SERVER } from '../lib/Const'
import { Logger } from '../utils/Logger'
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
import { Sandbox } from './Sandbox'
import { JsonHelper } from '../lib/JsonHelper'
import { HttpErrorForbidden, HttpErrorNotImplemented } from "./HttpErrors"
import { Swagger } from '../utils/Swagger'
import { TInternalResponse } from "../types/TInternalResponse"
import { HttpResponse } from "./HttpResponse"
import { AuthProvider } from "../providers/AuthProvider"
import { PERMISSION, Roles } from "./Roles"
import { TUserTokenInfo } from "./User"

export class Server {

    static readonly App: Express = express()
    static readonly Sandbox: Sandbox = new Sandbox()
    static Port: number
    static CurrentPath: string

    @Logger.LogFunction()
    static async Init(): Promise<void> {
        // Load Core
        Server.CoreLoad()

        // Init config
        await Config.Init()

        Server.Port = Config.Get<number>("server.port") ?? Config.DEFAULTS["server.port"]

        Server.App.use(responseTime())
        Server.App.use(Logger.RequestMiddleware)
        Server.App.use(rateLimit({
            ...(Config.DEFAULTS['server.response-rate'] as object),
            ...Config.Get<object>("server.response-rate")
        }))

        Server.App.use(express.json({
            limit: Config.Get<string | number>("server.request-limit") ?? Config.DEFAULTS['server.request-limit']
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
        if (Config.Flags.EnableCache) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.CACHE_PATH}`)
            Server.App.use(`${ROUTE.CACHE_PATH}/`, Server.SetContentJson, CacheRouter)
        }

        // path: /schedule
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEDULE_PATH}`)
        Server.App.use(`${ROUTE.SCHEDULE_PATH}/`, Server.SetContentJson, ScheduleRouter)

        // path: /api-docs
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SWAGGER_UI_PATH}`)

        // error handler
        Server.App.use((err: any, req: Request, res: Response, next: NextFunction) => {
            // format error
            res.status(err.status || 500).json({
                message: err.message,
                errors: err.errors
            })
        })

        Server.StartWatcher()
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

    @Logger.LogFunction()
    static async Reload(userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TJson>> {
        if (!Roles.HasPermission(userToken, undefined, PERMISSION.ADMIN))
            throw new HttpErrorForbidden('Permission denied')

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

    // @Logger.LogFunction()
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

        // // OpenApi
        // chokidar.watch(Swagger.OpenApiFilePath).on('change', () => {
        //     Logger.Info('OpenAPI specification changed. Reloading...')
        //     Swagger.Load()
        //     Swagger.Validator(Server.App)
        // })
    }

    static CoreLoad() {
        AuthProvider.RegisterProviders()
    }
}
