/* eslint-disable @typescript-eslint/no-var-requires */
//
//
//
//
//
import express, { Express, NextFunction, Request, Response } from 'express'
import { rateLimit } from 'express-rate-limit'
import winston from 'winston'
import expressWinston from 'express-winston'
import responseTime from 'response-time'

import { TJson } from '../types/TJson'
import { ROUTE, SERVER } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { Sources } from '../interpreter/Sources'
import { Cache } from '../server/Cache'
import { UserRouter } from '../routes/UserRouter'
import { ServerRouter } from '../routes/ServerRouter'
import { SchemaRouter } from '../routes/SchemaRouter'
import { PlanRouter } from '../routes/PlanRouter'
import { CacheRouter } from '../routes/CacheRouter'
import { ScheduleRouter } from '../routes/ScheduleRouter'
import { Schedule } from '../interpreter/Schedule'
// import { ScheduleRouter } from '../routes/ScheduleRouter'


export abstract class Server {

    public static App: Express = express()
    public static Port = 3000
    public static CurrentPath: string

    public static Init() {
        Config.Init()
        Logger.Debug(`${Logger.In} Server.Init`)

        Server.Port = Config.Configuration.server?.port ?? 3000

        const _limiter = rateLimit({
            windowMs: 1 * 60 * 1000,
            max: 600,
            message: 'Too many requests from this IP, please try again later.'
        })

        Server.App.use(responseTime())

        // TODO: fusion loggers
        Server.App.use(
            expressWinston.logger({
                transports: [new winston.transports.Console()],
                format: winston.format.json(),
                statusLevels: true,
                meta: false,
                msg: "HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{req.query}} {{req.body}} {{res.responseTime}}ms",
                expressFormat: true,
                ignoreRoute() {
                    return false
                },
                dynamicMeta(req) {
                    const body = JSON.stringify(req.body)
                    const query = JSON.stringify(req.query)
                    return {
                        body,
                        query
                    }
                }
            })
        )

        Server.App.use(_limiter)

        Server.App.use(express.json({
            limit: Config.Configuration.server['request-limit'] ?? '100mb'
        }))

        Server.App.use((req: Request, res: Response, next: NextFunction) => {
            res.setHeader('X-Powered-By', 'Metal')
            next()
        })

        // path: /
        Server.App.get('/', (req: Request, res: Response) => {
            res.status(200).send(SERVER.BANNER)
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

    public static Start() {
        Logger.Debug(`${Logger.In} Server.Start`)
        // Start Server
        Server.App.listen(
            Server.Port,
            () => {
                Logger.Message(SERVER.CONSOLE_BANNER)
                Logger.Message(`Metal server started on port ${Server.Port}`)
            })
    }

    public static Stop() {
        Logger.Debug(`${Logger.In} Server.Stop`)
    }

    public static async Reload() {
        Logger.Debug(`${Logger.In} Server.Reload`)
        Schedule.StopAll()
        await Cache.Disconnect()
        await Sources.DisconnectAll()
        Config.Init()
    }

    public static GetInfo(): TJson {
        Logger.Debug(`${Logger.In} Server.GetInfo`)
        const { NAME: _serverName, VERSION: _serverVersion } = SERVER
        return {
            server: _serverName,
            version: _serverVersion
        }
    }
}