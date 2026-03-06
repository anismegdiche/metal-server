//
//
//
//
//
import { Router } from "express"
import { ResponseHandler } from "../ResponseHandler"
//
import { SchemaResponse } from "../response/SchemaResponse"
import { UserResponse } from "../response/UserResponse"

//
export const SchemaRouter = Router()

//
SchemaRouter.route("/:schema").all(UserResponse.IsAuthenticated).get(SchemaResponse.ListEntities)

//
SchemaRouter.route("/:schema/:entity")
	.all(UserResponse.IsAuthenticated)
	.get(SchemaResponse.Select)
	.post(SchemaResponse.Insert)
	.patch(SchemaResponse.Update)
	.delete(SchemaResponse.Delete)

//
SchemaRouter.route("/:schema/:entity/by/:fieldName/:fieldValue")
	.all(UserResponse.IsAuthenticated)
	.get(ResponseHandler.ResponseNotImplemented)
	.post(ResponseHandler.ResponseNotImplemented)
	.patch(ResponseHandler.ResponseNotImplemented)
	.delete(ResponseHandler.ResponseNotImplemented)
