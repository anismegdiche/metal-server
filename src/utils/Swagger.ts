//
//
//
import { Express, Response, Request, NextFunction } from 'express'
// Lazy-loaded modules
import * as Fs from 'fs'
//
import { ROUTE } from "../modules/core/@consts"
import { TJson } from "../types/TJson"
import { Logger } from "./Logger"
// import { Package } from "./Package"

export class Swagger {

    static OpenApiFilePath = './openapi.yml'

    static Spec: TJson

    private static _yamlModule: typeof import('js-yaml');
    private static async _loadYamlModule(): Promise<typeof import('js-yaml')> {
        if (!this._yamlModule) {
            this._yamlModule = await import('js-yaml');
        }
        return this._yamlModule;
    }

    @Logger.LogFunction(true)
    static async Load() {
        const yaml = await Swagger._loadYamlModule();
        Swagger.Spec = yaml.load(
            Fs.readFileSync(Swagger.OpenApiFilePath, 'utf8')
        ) as TJson;
    }

    private static _swaggerUiModule: typeof import('swagger-ui-express');
    private static async _loadSwaggerUiModule(): Promise<typeof import('swagger-ui-express')> {
        if (!this._swaggerUiModule) {
            this._swaggerUiModule = await import('swagger-ui-express');
        }
        return this._swaggerUiModule;
    }

    @Logger.LogFunction(true)
    static async StartUi(app: Express) {
        const swaggerUi = await Swagger._loadSwaggerUiModule();
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

    private static _openApiValidatorModule: typeof import('express-openapi-validator');
    private static async _loadOpenApiValidatorModule(): Promise<typeof import('express-openapi-validator')> {
        if (!this._openApiValidatorModule) {
            this._openApiValidatorModule = await import('express-openapi-validator');
        }
        return this._openApiValidatorModule;
    }

    @Logger.LogFunction(true)
    static async Validator(app: Express) {
        const OpenApiValidator = await Swagger._loadOpenApiValidatorModule();
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