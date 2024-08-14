//
//
//
//
//
import express, { Express, NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import responseTime from 'response-time'
//
import { TJson } from '../types/TJson'
import { HTTP_STATUS_CODE, ROUTE, SERVER } from '../lib/Const'
import { Logger } from '../lib/Logger'
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

export class Server {

    static readonly App: Express = express()
    static readonly Sandbox: Sandbox = new Sandbox()
    static Port: number
    static CurrentPath: string

    static async Init(): Promise<void> {
        await Config.Init()
        Logger.Debug(`${Logger.In} Server.Init`)

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
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            next()
        })

        // path: /
        Server.App.get('/', (req: Request, res: Response) => {
            res.status(HTTP_STATUS_CODE.OK).send(SERVER.BANNER)
        })

        // path: /user
        if (Config.Flags.EnableAuthentication) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.USER_PATH}`)
            Server.App.use(`${ROUTE.USER_PATH}/`, UserRouter)
        }

        // path: /server
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SERVER_PATH}`)
        Server.App.use(`${ROUTE.SERVER_PATH}/`, ServerRouter)

        // path: /schema
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEMA_PATH}`)
        Server.App.use(`${ROUTE.SCHEMA_PATH}/`, SchemaRouter)

        // path: /plan
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.PLAN_PATH}`)
        Server.App.use(`${ROUTE.PLAN_PATH}/`, PlanRouter)

        // path: /cache
        if (Config.Flags.EnableCache) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.CACHE_PATH}`)
            Server.App.use(`${ROUTE.CACHE_PATH}/`, CacheRouter)
        }

        // path: /schedule
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEDULE_PATH}`)
        Server.App.use(`${ROUTE.SCHEDULE_PATH}/`, ScheduleRouter)
    }

    static Start() {
        Logger.Debug(`${Logger.In} Server.Start`)
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

    static Stop() {
        Logger.Debug(`${Logger.In} Server.Stop`)
    }

    static async Reload(): Promise<void> {
        Logger.Debug(`${Logger.In} Server.Reload`)
        Schedule.StopAll()
        await Cache.Disconnect()
        await Source.DisconnectAll()
        Config.Init()
    }

    static GetInfo(): TJson {
        Logger.Debug(`${Logger.In} Server.GetInfo`)
        return {
            server: SERVER.NAME,
            version: SERVER.VERSION
        }
    }
}
