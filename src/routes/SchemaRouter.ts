//
//
//
//
//
import { Router } from "express"
import { DataResponse } from "../response/DataResponse"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { HTTP_METHOD } from "../lib/Const"
import { CacheResponse } from "../response/CacheResponse"

export const SchemaRouter = Router()

//ROADMAP
SchemaRouter.route("/:schema")
    .all(
        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        DataResponse.IsSchemaExist
    )
    .get(ServerResponse.NotImplemented)
    .post(ServerResponse.NotImplemented)
    .patch(ServerResponse.NotImplemented)
    .delete(ServerResponse.NotImplemented)

SchemaRouter.route("/:schema/:entity")
    .all(

        (req, res, next) => ServerResponse.AllowMethods(req, res, next, HTTP_METHOD.GET, HTTP_METHOD.POST, HTTP_METHOD.PATCH, HTTP_METHOD.DELETE),
        UserResponse.IsAuthenticated,
        DataResponse.IsSchemaExist
    )
    .get(
        CacheResponse.Get,
        DataResponse.Select
    )
    .post(
        DataResponse.Insert
    )
    .patch(
        DataResponse.Update
    )
    .delete(
        DataResponse.Delete
    )