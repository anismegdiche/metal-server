//
//
//
import { Express, Response, Request, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import * as Yaml from 'js-yaml'
import * as Fs from 'fs'
import * as OpenApiValidator from 'express-openapi-validator'
//
import { ROUTE } from "../modules/core/@consts"
import { TJson } from "../types/TJson"
import { Logger } from "./Logger"
// import { Package } from "./Package"

export class Swagger {

    static OpenApiFilePath = './openapi.yml'

    static Spec: TJson

    @Logger.LogFunction(true)
    static Load() {
        Swagger.Spec = Yaml.load(
            Fs.readFileSync(Swagger.OpenApiFilePath, 'utf8')
        ) as TJson
    }

    @Logger.LogFunction(true)
    static StartUi(app: Express) {

        app.use(ROUTE.SWAGGER_UI_PATH, swaggerUi.serve, swaggerUi.setup(Swagger.Spec))
        app.use(
            (req: Request, res: Response, next: NextFunction) => {
                if (req.path.startsWith(ROUTE.SWAGGER_UI_PATH)) {
                    return next()  // Skip validation for /api-docs
                }
                next()  // Proceed to OpenAPI validator for other routes
            }
        )
    }

    @Logger.LogFunction(true)
    static Validator(app: Express) {
        // // Remove existing middleware (if any)
        // app._router.stack = app._router.stack.filter((layer: any) => !layer.name.endsWith('Middleware'))

        // request validator
        app.use(OpenApiValidator.middleware({
            apiSpec: Swagger.OpenApiFilePath,    // Path to your OpenAPI spec
            validateRequests: true,              // Validate request bodies, params, query params, etc.
            validateResponses: true              // Optionally validate responses as well
        }))
    }
}