//
//
//
//
//
import { Express, Request, Response } from 'express'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
//
import { ROUTE } from "../lib/Const"
import { Package } from "./Package"

export class Swagger {

    static Options = {
        definition: {
            openapi: "3.0.0",
            info: {
                title: 'Metal Server API Docs',
                version: Package.Json.version as string
            },
            components: {
                securitySchemas: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            },
            security: [
                {
                    bearerAuth: []
                }
            ],
            tags: [
                {
                    name: "User",
                    description: "Operations about User",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#user"
                    }
                },
                {
                    name: "Server",
                    description: "Operations about Server",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#server"
                    }
                },                
                {
                    name: "Schema",
                    description: "Operations about Schema",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#schema"
                    }
                },
                {
                    name: "Entity",
                    description: "Operations about Entity",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#schema"
                    }
                },
                {
                    name: "Plan",
                    description: "Operations about Plan",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#plan"
                    }
                },
                {
                    name: "Cache",
                    description: "Operations about Cache",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#cache"
                    }
                },
                {
                    name: "Schedule",
                    description: "Operations about Scheduler",
                    externalDocs: {
                        description: "Find out more",
                        url: "https://metal-docs-sh3b0.kinsta.page/documentation/rest-api.html#schedule"
                    }
                }
            ]
        },
        apis: ['./src/**/*.ts']
    }

    static Spec = swaggerJsdoc(Swagger.Options)

    static StartUi(app: Express) {
        app.use(ROUTE.SWAGGER_UI_PATH, swaggerUi.serve, swaggerUi.setup(Swagger.Spec))
        app.use('/docs.json', (req: Request, res: Response) => {
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.send(Swagger.Spec)
        })
    }
}