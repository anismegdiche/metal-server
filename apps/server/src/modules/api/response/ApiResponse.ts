//
//
//

import { Logger } from "@metal/logger"
import type { Request, Response } from "express"
import { Assert } from "../../../utils/Assert"
//
import { Convert } from "../../../utils/Convert"
import { AUTH_PERMISSION } from "../../auth/@consts"
import { Roles } from "../../auth/Roles"
import { ConfigManager } from "../../core/ConfigManager"
import { HttpResponse } from "../../core/HttpResponse"
import { RequestHandler } from "../../core/RequestHandler"
import { ResponseHandler } from "../../core/ResponseHandler"
import { ServerRuntime } from "../../core/ServerRuntime"
import type { U_config } from "../../core/types/U_config"
import { z_U_config } from "../../core/types/U_config"
import { type HttpError, HttpErrorInternalServerError } from "../../errors/HttpErrors"
import type { TSchemaRequestListEntities, TSchemaRequestSelect } from "../../schema/types/TSchemaRequest"
import { SourceRegistry } from "../../source/SourceRegistry"
import type { TSource } from "../../source/types/TSource"

const VALID_SECTIONS = ["server", "sources", "schemas", "plans", "schedules", "roles", "users", "ai-engines"]

export class ApiResponse {
	static GetConfig(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			Convert.InternalResponseToResponse(res, HttpResponse.Ok(config))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static GetSection(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const section = String(req.params.section)

			if (!VALID_SECTIONS.includes(section)) {
				throw new HttpErrorInternalServerError(`Invalid section: ${section}. Valid sections: ${VALID_SECTIONS.join(", ")}`)
			}

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			const value = (config as Record<string, unknown>)[section]
			Convert.InternalResponseToResponse(res, HttpResponse.Ok(value ?? null))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static GetSectionItem(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const section = String(req.params.section)
			const name = String(req.params.name)

			if (!VALID_SECTIONS.includes(section)) {
				throw new HttpErrorInternalServerError(`Invalid section: ${section}`)
			}

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			const sectionData = (config as Record<string, unknown>)[section]
			if (!sectionData || typeof sectionData !== "object") {
				throw new HttpErrorInternalServerError(`Section '${section}' is empty or not an object`)
			}

			const item = (sectionData as Record<string, unknown>)[name]
			if (item === undefined) {
				throw new HttpErrorInternalServerError(`Item '${name}' not found in section '${section}'`)
			}

			Convert.InternalResponseToResponse(res, HttpResponse.Ok(item))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static PutConfig(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const newConfig = req.body as U_config

			const result = z_U_config.safeParse(newConfig)
			if (!result.success) {
				const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
				throw new HttpErrorInternalServerError(`Configuration validation failed: ${errors}`)
			}

			ConfigManager.configStore?.Init(result.data)
			ConfigManager.Save()
			Logger.Info("Configuration updated via API")

			Convert.InternalResponseToResponse(res, HttpResponse.Ok({ message: "Configuration saved" }))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static PatchSection(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const section = String(req.params.section)

			if (!VALID_SECTIONS.includes(section)) {
				throw new HttpErrorInternalServerError(`Invalid section: ${section}`)
			}

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			const patchData = req.body
			const currentSection = (config as Record<string, unknown>)[section] ?? {}

			const merged = { ...(currentSection as Record<string, unknown>), ...patchData }

			;(config as Record<string, unknown>)[section] = merged

			const result = z_U_config.safeParse(config)
			if (!result.success) {
				const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
				throw new HttpErrorInternalServerError(`Configuration validation failed: ${errors}`)
			}

			ConfigManager.configStore?.Init(result.data)
			ConfigManager.Save()
			Logger.Info(`Configuration section '${section}' updated via API`)

			Convert.InternalResponseToResponse(res, HttpResponse.Ok({ message: `Section '${section}' saved` }))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static PutSectionItem(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const section = String(req.params.section)
			const name = String(req.params.name)

			if (!VALID_SECTIONS.includes(section)) {
				throw new HttpErrorInternalServerError(`Invalid section: ${section}`)
			}

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			const sectionData = (config as Record<string, unknown>)[section]
			if (!sectionData || typeof sectionData !== "object") {
				;(config as Record<string, unknown>)[section] = {}
			}

			const target = (config as Record<string, unknown>)[section] as Record<string, unknown>
			target[name] = req.body

			const result = z_U_config.safeParse(config)
			if (!result.success) {
				const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
				throw new HttpErrorInternalServerError(`Configuration validation failed: ${errors}`)
			}

			ConfigManager.configStore?.Init(result.data)
			ConfigManager.Save()
			Logger.Info(`Configuration item '${section}/${name}' updated via API`)

			Convert.InternalResponseToResponse(res, HttpResponse.Ok({ message: `Item '${name}' saved in section '${section}'` }))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static DeleteSectionItem(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const section = String(req.params.section)
			const name = String(req.params.name)

			if (!VALID_SECTIONS.includes(section)) {
				throw new HttpErrorInternalServerError(`Invalid section: ${section}`)
			}

			const config = ConfigManager.configStore?.Configuration
			if (!config) {
				throw new HttpErrorInternalServerError("Configuration not initialized")
			}

			const sectionData = (config as Record<string, unknown>)[section]
			if (!sectionData || typeof sectionData !== "object") {
				throw new HttpErrorInternalServerError(`Section '${section}' is empty`)
			}

			if (!(sectionData as Record<string, unknown>)[name]) {
				throw new HttpErrorInternalServerError(`Item '${name}' not found in section '${section}'`)
			}

			delete (sectionData as Record<string, unknown>)[name]

			const result = z_U_config.safeParse(config)
			if (!result.success) {
				const errors = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
				throw new HttpErrorInternalServerError(`Configuration validation failed: ${errors}`)
			}

			ConfigManager.configStore?.Init(result.data)
			ConfigManager.Save()
			Logger.Info(`Configuration item '${section}/${name}' deleted via API`)

			Convert.InternalResponseToResponse(
				res,
				HttpResponse.Ok({ message: `Item '${name}' deleted from section '${section}'` }),
			)
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static GetLogs(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			const { start, end, limit, offset, reverse } = req.params

			const resolvedStart = start === "*" ? "" : String(start)
			const resolvedEnd = end === "*" ? "\uffff" : String(end)
			const resolvedLimit = limit === "*" ? 100 : Number(limit)
			const resolvedOffset = offset === "*" ? undefined : Number(offset)

			const entries =
				Logger.db?.findRange({
					start: resolvedStart,
					end: resolvedEnd,
					limit: resolvedLimit,
					offset: resolvedOffset,
					reverse: reverse === "true",
				}) ?? []

			const logs = entries.map(([key, entry]) => {
				const ts = entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp)
				return {
					id: key,
					timestamp: ts.toISOString().replace("T", " ").slice(0, 19),
					level: entry.level,
					message: entry.message,
					source: entry.server ?? "server",
				}
			})

			Convert.InternalResponseToResponse(
				res,
				HttpResponse.Ok({
					data: logs,
					meta: {
						total: Logger.db?.entries().length ?? 0,
						limit: resolvedLimit,
						offset: resolvedOffset,
						start: start,
						end: end,
						reverse: reverse === "true",
					},
				}),
			)
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static ClearLogs(req: Request, res: Response): void {
		try {
			//RequestHandler.CheckRequestHasCurrentUser(req)
			//Roles.CheckPermission(req.__METAL_CURRENT_USER, undefined, AUTH_PERMISSION.ADMIN)

			Logger.db?.clear()

			Convert.InternalResponseToResponse(res, HttpResponse.Ok({ message: "All logs cleared" }))
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static ReloadServer(req: Request, res: Response): void {
		//RequestHandler.CheckRequestHasCurrentUser(req)
		ServerRuntime.Reload(req.__METAL_CURRENT_USER)
			.then((intRes) => Convert.InternalResponseToResponse(res, intRes))
			.catch((error: HttpError) => ResponseHandler.ResponseError(res, error))
	}

	static async ListSourceEntities(req: Request, res: Response): Promise<void> {
		try {
			const sourceName = String(req.params.source)

			const source = Assert.Get<TSource>(
				SourceRegistry.Sources.get(sourceName),
				`Source '${sourceName}' not found or not connected`,
			)

			const schemaRequest: TSchemaRequestListEntities = {
				schema: sourceName,
				source: sourceName,
			}

			const intRes = await source.DataProvider.ListEntities(schemaRequest)

			if (!intRes.Body) {
				throw new HttpErrorInternalServerError("No response from source")
			}

			await ResponseHandler.FromSchemaResponse(intRes.Body, res)
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}

	static async SelectSourceEntityRows(req: Request, res: Response): Promise<void> {
		try {
			const sourceName = String(req.params.source)
			const entity = String(req.params.entity)
			const limit = req.query.limit ? Number(req.query.limit) : 20

			const source = SourceRegistry.Sources.get(sourceName)
			if (!source) {
				throw new HttpErrorInternalServerError(`Source '${sourceName}' not found or not connected`)
			}

			const schemaRequest: TSchemaRequestSelect = {
				schema: sourceName,
				entity,
				source: sourceName,
			}

			const intRes = await source.DataProvider.Select(schemaRequest)

			if (!intRes.Body) {
				throw new HttpErrorInternalServerError("No response from source")
			}

			await ResponseHandler.FromSchemaResponse(intRes.Body, res)
		} catch (error) {
			ResponseHandler.ResponseError(res, error as HttpError)
		}
	}
}
