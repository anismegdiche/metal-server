//
//
//
//
//
import { NextFunction, Request, Response, Router } from "express"
import { ParamsDictionary } from "express-serve-static-core"
import { ParsedQs } from "qs"
//
import { SchemaResponse } from "../response/SchemaResponse"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { CacheResponse } from "../response/CacheResponse"

export const SchemaRouter = Router()

//ROADMAP
SchemaRouter.route("/:schemaName")
    .all((req: Request, res: Response, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        SchemaResponse.CheckParameters
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

SchemaRouter.route("/:schemaName/:entityName")
    .all((req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>, res: Response<any, Record<string, any>>, next: NextFunction) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        SchemaResponse.ParameterValidation,
        SchemaResponse.CheckParameters
    )
    .get(
        CacheResponse.Get,
        SchemaResponse.Select
    )
    .post(
        SchemaResponse.Insert
    )
    .patch(
        SchemaResponse.Update
    )
    .delete(
        SchemaResponse.Delete
    )