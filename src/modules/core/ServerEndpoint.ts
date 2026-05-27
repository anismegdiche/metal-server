/** biome-ignore-all lint/complexity/noStaticOnlyClass: !+ */
//
//
//
import express, { type Express, type NextFunction, type Request, type Response } from "express"
import rateLimit from "express-rate-limit"
import helmet from "helmet"
import responseTime from "response-time"
//
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from "../../utils/Logger"
import { Swagger } from "../../utils/Swagger"
import { HTTP_STATUS_CODE, ROUTE, SERVER } from "./@consts"
import { ConfigManager } from "./ConfigManager"
import { ServerCore } from "./ServerCore"
import { ServerShutdown } from "./ServerShutdown"
import { ResponseHandler } from "./ResponseHandler"
import { ServerRouter } from "./routes/ServerRouter"


//
export class ServerEndpoint {
	static readonly Api: Express = express()
	static Port: number

	// Queue for module middleware registration
	private static readonly _middlewareHooksQueue: Array<() => void> = []

	static RegisterMiddleware(registrationFn: () => void): void {
		ServerEndpoint._middlewareHooksQueue.push(registrationFn)
	}

	static ExecuteMiddlewareHooksQueue(): void {
		ServerEndpoint._middlewareHooksQueue.forEach(fn => {
			fn()
		})
	}

	static RegisterServerMiddleware(): void {
		ServerEndpoint.RegisterMiddleware(() => {
			Logger.Info(`Route: Enabling API, URL= ${ROUTE.SERVER_PATH}`)
			ServerEndpoint.Api.use(`${ROUTE.SERVER_PATH}/`, ResponseHandler.SetContentJson, ServerRouter)
		})
	}

	static InitApi() {
		ServerEndpoint.Port = ConfigManager.Get<number>("server.port")

		ServerEndpoint.Api.use(helmet())

		ServerEndpoint.Api.use(responseTime())
		ServerEndpoint.Api.use(Logger.RequestMiddleware)
		ServerEndpoint.Api.use(rateLimit(ConfigManager.Get<object>("server.response-rate")))

		ServerEndpoint.Api.use(
			express.json({
				limit: ConfigManager.Get<string | number>("server.request-limit"),
			}),
		)

		ServerEndpoint.Api.use((_req: Request, res: Response, next: NextFunction) => {
			res.setHeader("X-Powered-By", "Metal")
			next()
		})

		Swagger.Load()
			.then(() => {
				Swagger.StartUi(ServerEndpoint.Api)
				Swagger.Validator(ServerEndpoint.Api)
			})
			.catch((error) => Logger.Error(error))

		// path: /
		ServerEndpoint.Api.get("/", (_req: Request, res: Response) => {
			res.status(HTTP_STATUS_CODE.OK).send(SERVER.BANNER)
		})

		// Execute module middleware registration queue
		ServerEndpoint.ExecuteMiddlewareHooksQueue()

		// path: /api-docs
		Logger.Info(`Route: Enabling Swagger UI, URL= ${ROUTE.SWAGGER_UI_PATH}`)

		// error handler
		ServerEndpoint.Api.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
			// format error
			res.status(err.Status || err.status || 500).json({
				message: err.message,
				errors: err.errors,
			})
		})
	}

	@Logger.LogFunction()
	static Start() {
		// Start Server
		const server = ServerEndpoint.Api.listen(ServerEndpoint.Port, () => {
			Logger.Message(SERVER.CONSOLE_BANNER)
			Logger.Message(`Metal server started on port ${ServerEndpoint.Port}`)
			Logger.Message(`version: ${SERVER.VERSION}`)
		}).on("error", (error: Error & { code?: string }) => {
			if (error.code === "EADDRINUSE") {
				Logger.Error(`Port ${ServerEndpoint.Port} is already in use. Exiting the process.`)
				process.exit(1)
			} else {
				Logger.Error(`An error occurred: ${JsonUtils.Stringify(error)}`)
			}
		})

		// Register server instance for graceful shutdown
		ServerShutdown.RegisterHttpServer(server)
	}
}
