//
//
//
//
//
import { Router } from "express"
//
import { SchemaResponse } from "../response/SchemaResponse"
import { UserResponse } from "../response/UserResponse"
import { ServerResponse } from "../response/ServerResponse"
import { CacheResponse } from "../response/CacheResponse"


export const SchemaRouter = Router()

SchemaRouter.route("/:schema")
    .all(UserResponse.IsAuthenticated)
    .get(SchemaResponse.ListEntities)

SchemaRouter.route("/:schema/:entity")
    .all(UserResponse.IsAuthenticated)
    .get(CacheResponse.Get, SchemaResponse.Select)
    .post(SchemaResponse.Insert)
    .patch(SchemaResponse.Update)
    .delete(SchemaResponse.Delete)

//ROADMAP
SchemaRouter.route("/:schema/:entity/:id")
    .all(UserResponse.IsAuthenticated)
    .get(ServerResponse.ResponseNotImplemented)
    .post(ServerResponse.ResponseNotImplemented)
    .patch(ServerResponse.ResponseNotImplemented)
    .delete(ServerResponse.ResponseNotImplemented)