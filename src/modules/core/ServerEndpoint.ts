//
//
//
import express, { Express, NextFunction, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import responseTime from 'response-time'
//
import { Logger } from '../../utils/Logger'
import { Swagger } from '../../utils/Swagger'
import { Cache } from '../cache/Cache'
import { HTTP_STATUS_CODE, ROUTE, SERVER } from './@consts'
import { ConfigManager } from './ConfigManager'
import { ResponseHandler } from './ResponseHandler'
import { CacheRouter } from './routes/CacheRouter'
import { PlanRouter } from './routes/PlanRouter'
import { ScheduleRouter } from './routes/ScheduleRouter'
import { SchemaRouter } from './routes/SchemaRouter'
import { ServerRouter } from './routes/ServerRouter'
import { UserRouter } from './routes/UserRouter'
import { JsonUtils } from '../../utils/JsonUtils'


//
export class ServerEndpoint {
    static readonly Api: Express = express()
    static Port: number  //NOSONAR

    static InitApi() {
        ServerEndpoint.Port = ConfigManager.Get<number>("server.port")

        ServerEndpoint.Api.use(helmet())

        ServerEndpoint.Api.use(responseTime())
        ServerEndpoint.Api.use(Logger.RequestMiddleware)
        ServerEndpoint.Api.use(rateLimit(ConfigManager.Get<object>("server.response-rate")))

        ServerEndpoint.Api.use(express.json({
            limit: ConfigManager.Get<string | number>("server.request-limit")
        }))

        ServerEndpoint.Api.use((req: Request, res: Response, next: NextFunction) => {
            res.setHeader('X-Powered-By', 'Metal')
            next()
        })

        Swagger.Load()
        Swagger.StartUi(ServerEndpoint.Api)
        Swagger.Validator(ServerEndpoint.Api)

        // path: /
        ServerEndpoint.Api.get('/', (req: Request, res: Response) => {
            res.status(HTTP_STATUS_CODE.OK).send(SERVER.BANNER)
        })

        // path: /user
        if (ConfigManager.Get("server.authentication")) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.USER_PATH}`)
            ServerEndpoint.Api.use(`${ROUTE.USER_PATH}/`, ResponseHandler.SetContentJson, UserRouter)
        }

        // path: /server
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SERVER_PATH}`)
        ServerEndpoint.Api.use(`${ROUTE.SERVER_PATH}/`, ResponseHandler.SetContentJson, ServerRouter)

        // path: /schema
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEMA_PATH}`)
        ServerEndpoint.Api.use(`${ROUTE.SCHEMA_PATH}/`, ResponseHandler.SetContentJson, SchemaRouter)

        // path: /plan
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.PLAN_PATH}`)
        ServerEndpoint.Api.use(`${ROUTE.PLAN_PATH}/`, ResponseHandler.SetContentJson, PlanRouter)

        // path: /cache
        if (Cache.IsEnabled) {
            Logger.Info(`Route: Enabling API, URL= ${ROUTE.CACHE_PATH}`)
            ServerEndpoint.Api.use(`${ROUTE.CACHE_PATH}/`, ResponseHandler.SetContentJson, CacheRouter)
        }

        // path: /schedule
        Logger.Info(`Route: Enabling API, URL= ${ROUTE.SCHEDULE_PATH}`)
        ServerEndpoint.Api.use(`${ROUTE.SCHEDULE_PATH}/`, ResponseHandler.SetContentJson, ScheduleRouter)

        // path: /api-docs
        Logger.Info(`Route: Enabling Swagger UI, URL= ${ROUTE.SWAGGER_UI_PATH}`)

        // error handler
        ServerEndpoint.Api.use((err: any, req: Request, res: Response, _next: NextFunction) => {
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
        ServerEndpoint.Api
            .listen(
                ServerEndpoint.Port,
                () => {
                    Logger.Message(SERVER.CONSOLE_BANNER)
                    Logger.Message(`Metal server started on port ${ServerEndpoint.Port}`)
                    Logger.Message(`version: ${SERVER.VERSION}`)
                })
            .on('error', (error: Error & { code?: string }) => {
                if (error.code === 'EADDRINUSE') {
                    Logger.Error(`Port ${ServerEndpoint.Port} is already in use. Exiting the process.`)
                    process.exit(1)
                } else {
                    Logger.Error(`An error occurred: ${JsonUtils.Stringify(error)}`)
                }
            })
    }
}
