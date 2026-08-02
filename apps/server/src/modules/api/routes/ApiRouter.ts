//
//
//
import { Router } from "express"
//
import { UserResponse } from "../../core/response/UserResponse"
import { ApiResponse } from "../response/ApiResponse"


//
export const ApiRouter: Router = Router()


// GET /api/config — full config
ApiRouter.route("/config")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.GetConfig)
	.put(ApiResponse.PutConfig)

// POST /api/config/reload — reload server after config change
ApiRouter.route("/config/reload")
	.all(UserResponse.IsAuthenticated)
	.post(ApiResponse.ReloadServer)

// GET /api/config/:section — get a config section
ApiRouter.route("/config/:section")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.GetSection)
	.patch(ApiResponse.PatchSection)

// GET/PUT/DELETE /api/config/:section/:name — get/create/delete a named item
ApiRouter.route("/config/:section/:name")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.GetSectionItem)
	.put(ApiResponse.PutSectionItem)
	.delete(ApiResponse.DeleteSectionItem)

// GET /api/logs/:start/:end/:limit/:offset/:reverse — server logs
ApiRouter.route("/logs/:start/:end/:limit/:offset/:reverse")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.GetLogs)

// DELETE /api/logs — clear all logs
ApiRouter.route("/logs")
	.all(UserResponse.IsAuthenticated)
	.delete(ApiResponse.ClearLogs)

// GET /api/source/:source — list entities in a source
ApiRouter.route("/source/:source")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.ListSourceEntities)

// GET /api/source/:source/:entity — list rows in a source entity
ApiRouter.route("/source/:source/:entity")
	.all(UserResponse.IsAuthenticated)
	.get(ApiResponse.SelectSourceEntityRows)
