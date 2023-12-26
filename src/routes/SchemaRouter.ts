//
//
//
//
//
import { Router } from "express"
import { SchemaResponse } from "../response/SchemaResponse"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { CacheResponse } from "../response/CacheResponse"

export const SchemaRouter = Router()

//ROADMAP
SchemaRouter.route("/:schemaName")
    .all((req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        SchemaResponse.IsExist
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

SchemaRouter.route("/:schemaName/:entityName")
    .all((req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        SchemaResponse.IsExist
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