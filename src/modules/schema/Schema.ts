//
//
//
import { DataTable } from "../../types/DataTable"
import { Assert } from "../../utils/Assert"
import { DataTableUtils } from "../../utils/DataTableUtils"
import { Logger } from "../../utils/Logger"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { HTTP_STATUS_CODE } from "../core/@consts"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import type { U__schemas, U__schemas_schema, U__schemas_schema_entities_entity } from "../core/types/U__schemas"
import { HttpErrorBadRequest, HttpErrorNotFound } from "../errors/HttpErrors"
import type { IDataProvider } from "../source/base/IDataProvider"
import { SourceRegistry } from "../source/SourceRegistry"
import type {
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate
} from "./types/TSchemaRequest"
import {
	z_TSchemaRequestDelete,
	z_TSchemaRequestInsert,
	z_TSchemaRequestListEntities,
	z_TSchemaRequestSelect,
	z_TSchemaRequestUpdate,
} from "./types/TSchemaRequest"
import type { TSchemaResponse } from "./types/TSchemaResponse"
import { z_TSchemaResponse } from "./types/TSchemaResponse"

//
// export type TSchemaRoute = {
// 	type: "source" | "nothing"
// 	routeName: string
// 	entity?: string
// }

// export type TSourceTypeExecuteParams = {
// 	source: string
// 	entity: string
// 	schemaRequest: TSchemaRequestSelect | TSchemaRequestUpdate | TSchemaRequestDelete | TSchemaRequestInsert

// 	CrudFunction: Function
// }

// export type TEntitiesMap = Map<
// 	string,
// 	{
// 		source: string
// 		database?: string
// 	}
// >

type TSchemaEntityRoute = {
	sourceName: string
	sourceEntityName?: string
}

type TSchemaEntityRoutes = Map<string, TSchemaEntityRoute>

//
export class Schema {
	static _schemaParams: U__schemas
	static _schemaRoles = new Map<string, string[]>()
	static _schemaRoutes = new Map<string, TSchemaEntityRoutes>()

	static fnCacheGet?: Function

	// static readonly SourceTypeCaseMap: Record<string, Function> = {
	// 	nothing: async (sourceTypeExecuteParams: TSourceTypeExecuteParams) =>
	// 		await Schema.#NothingTodo(sourceTypeExecuteParams),
	// 	source: async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CrudFunction(),
	// }

	// static async #NothingTodo(sourceTypeExecuteParams: TSourceTypeExecuteParams): Promise<void> {
	// 	const { schema, entity } = sourceTypeExecuteParams.schemaRequest
	// 	Logger.Warn(`${schema}: Entity '${entity}' not found`)
	// 	throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)
	// }

	// static async #MergeData(schemaResponse: TSchemaResponse, schemaResponseToMerge?: TSchemaResponse)
	// 	: Promise<TSchemaResponse> {

	// 	if (!schemaResponseToMerge)
	// 		return schemaResponse

	// 	const isSchemaResponseWithData = (await schemaResponse?.data?.Count()) > 0
	// 	const isSchemaResponseToMergeWithData = (await schemaResponseToMerge?.data?.Count()) > 0

	// 	// only schemaResponse got data
	// 	if (isSchemaResponseWithData && !isSchemaResponseToMergeWithData)
	// 		return schemaResponse

	// 	// only schemaResponseToMerge got data
	// 	if (!isSchemaResponseWithData && isSchemaResponseToMergeWithData)
	// 		return <TSchemaResponse>{
	// 			...schemaResponseToMerge,
	// 			schema: schemaResponse.schema,
	// 			entity: schemaResponse.entity,
	// 			status: schemaResponseToMerge.status,
	// 		}

	// 	// both got data
	// 	if (isSchemaResponseWithData && isSchemaResponseToMergeWithData)
	// 		return <TSchemaResponse>{
	// 			...schemaResponse,
	// 			data: await schemaResponse.data.RowsAdd(await schemaResponseToMerge.data.Rows()),
	// 		}

	// 	// anything else
	// 	return schemaResponse
	// }

	// static IsSchemaRequestSelect(schemaRequest: unknown): schemaRequest is TSchemaRequestSelect {
	// 	return z_TSchemaRequestSelect.safeParse(schemaRequest).success
	// }

	// static IsSchemaRequestUpdate(schemaRequest: unknown): schemaRequest is TSchemaRequestUpdate {
	// 	return z_TSchemaRequestUpdate.safeParse(schemaRequest).success
	// }

	// static IsSchemaRequestInsert(schemaRequest: unknown): schemaRequest is TSchemaRequestInsert {
	// 	return z_TSchemaRequestInsert.safeParse(schemaRequest).success
	// }

	// static IsSchemaRequestDelete(schemaRequest: unknown): schemaRequest is TSchemaRequestDelete {
	// 	return z_TSchemaRequestDelete.safeParse(schemaRequest).success
	// }

	@Logger.LogFunction(true)
	static IsSchemaResponse(schemaResponse: unknown): schemaResponse is TSchemaResponse {
		return z_TSchemaResponse.safeParse(schemaResponse).success
	}

	static Init(fnCacheGet: Function) {
		if (!ConfigManager.Has("schemas")) {
			Logger.Warn(`section 'schemas' not found in configuration`)
			throw new HttpErrorNotFound(`section 'schemas' not found in configuration`)
		}

		Schema._schemaParams = ConfigManager.Get<U__schemas>("schemas")
		Schema._buildSchemaRoutes()
		Schema._buildSchemaRoles()
		Schema.fnCacheGet = fnCacheGet
	}

	static _buildSchemaRoutes() {
		Schema._schemaRoutes.clear()

		const schemas = Schema._schemaParams

		Object.entries(schemas).forEach(([_schemaName, _schemaParams]: [string, U__schemas_schema]) => {
			const _entities = new Map<string, TSchemaEntityRoute>()

			if (_schemaParams.source) {
				_entities.set("*", <TSchemaEntityRoute>{
					sourceName: _schemaParams.source,
					sourceEntityName: undefined,
				})
			}

			if (_schemaParams.entities) {
				Object.entries(_schemaParams.entities).forEach(
					([__entityName, __entityParams]: [string, U__schemas_schema_entities_entity]) => {
						_entities.set(__entityName, <TSchemaEntityRoute>{
							sourceName: __entityParams.source,
							sourceEntityName: __entityParams.entity,
						})
					},
				)
			}
			Schema._schemaRoutes.set(_schemaName, _entities)
		})
	}

	static _buildSchemaRoles() {
		Schema._schemaRoles.clear()

		Object.entries(Schema._schemaParams).forEach(([_schemaName, _schemaParams]: [string, U__schemas_schema]) => {
			if (_schemaParams.roles) Schema._schemaRoles.set(_schemaName, _schemaParams.roles)
		})
	}

	static _getEntityRoute(schema: string, entity: string): TSchemaEntityRoute {
		const entities = Schema._schemaRoutes.get(schema)
		if (!entities) {
			throw new HttpErrorNotFound(`entity '${entity}' not found in schema '${schema}'`)
		}

		const entityRoute = entities.get(entity)
		if (!entityRoute) {
			// Check for wildcard route
			const wildcardRoute = entities.get("*")
			if (wildcardRoute) {
				return wildcardRoute
			}
			// Fallback to schema name (should not happen with proper configuration)
			return {
				sourceName: schema,
				sourceEntityName: undefined,
			}
		}
		return entityRoute
	}

	@Logger.LogFunction(true)
	// static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {

	// 	const { schema } = schemaRequest

	// 	if (!Schema._schemaRoutes.has(schema)) {
	// 		throw new HttpErrorNotFound(`schema '${schema}' not found`)
	// 	}
	// }

	// //FIXME rewrite with GetEntitiesSources
	// @Logger.LogFunction(true)
	// static GetRoute(schema: string, entity: string, schemaConfig: any): TSchemaRoute {
	// 	const nothingToDoSchemaRoute: TSchemaRoute = {
	// 		type: "nothing",
	// 		routeName: "",
	// 	}

	// 	// schema.entities.*
	// 	if (has(schemaConfig, `entities.${entity}`)) {
	// 		const _schemaEntityConfig: TSchemaRequest = JsonUtils.Get(schemaConfig.entities, entity)

	// 		if (_schemaEntityConfig === undefined) {
	// 			Logger.Warn(`Entity '${entity}' not found in schema '${schema}'`)
	// 			return nothingToDoSchemaRoute
	// 		}

	// 		const { source: _source, entity: _entity } = _schemaEntityConfig as TSchemaRequestBase

	// 		// schema.entities.*.source
	// 		if (_source) {
	// 			if (!ConfigManager.Has(`sources.${_source}`)) {
	// 				Logger.Warn(`Source not found for entity '${entity}'`)
	// 				return nothingToDoSchemaRoute
	// 			}
	// 			return {
	// 				type: "source",
	// 				routeName: _source,
	// 				entity: _entity,
	// 			}
	// 		}
	// 	}

	// 	// schema.source
	// 	if (schemaConfig?.source) {
	// 		if (!ConfigManager.Has(`sources.${schemaConfig.source}`)) {
	// 			Logger.Warn(`Source not found for schema '${schema}'`)
	// 			return nothingToDoSchemaRoute
	// 		}
	// 		return {
	// 			type: "source",
	// 			routeName: schemaConfig.source,
	// 			entity,
	// 		}
	// 	}

	// 	Logger.Warn(`Nothing to do in the 'schemas' section`)
	// 	return nothingToDoSchemaRoute
	// }

	@Logger.LogFunction(true)
	static async Select(
		schemaRequest: TSchemaRequestSelect,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse | undefined>> {
		Assert.Var<Function>(Schema.fnCacheGet, "Schema.fnCacheGet is not initialized")

		Assert.Var<TSchemaRequestSelect>(
			schemaRequest,
			z_TSchemaRequestSelect.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema, entity } = schemaRequest

		// check roles
		const schemaRoles = Schema._schemaRoles.get(schema)
		Roles.CheckPermission(userToken, schemaRoles, AUTH_PERMISSION.READ)

		const schemaParams = Schema._schemaParams[schema]

		const entityRoute = Schema._getEntityRoute(schema, entity)
		Assert.Var<TSchemaEntityRoute>(entityRoute, `${schema}: No route found for entity ${entity}`)

		// check for cache before return
		const cachedData = await Schema.fnCacheGet(schemaRequest, userToken).catch(undefined)

		if (cachedData) return cachedData

		const sourceDataProvider = SourceRegistry.Sources.get(entityRoute.sourceName)?.DataProvider
		Assert.Var<IDataProvider>(sourceDataProvider, sourceDataProvider !== undefined, "Source data provider not found")

		const intResp = await sourceDataProvider.Select(<TSchemaRequestSelect>{
			...schemaRequest,
			source: entityRoute.sourceName,
			entity: entityRoute.sourceEntityName ?? schemaRequest.entity,
		})

		if (!intResp?.Body) return intResp

		// TODO: check if useless
		// await _intResp.Body.data.FieldsSet()

		// Anonymizer
		if (schemaParams?.anonymize && Schema.IsSchemaResponse(intResp.Body) && (await intResp.Body.data.Count()) > 0) {
			intResp.Body.data = await DataTableUtils.Anonymize(intResp.Body.data, schemaParams.anonymize)
		}
		return intResp
	}

	@Logger.LogFunction(true)
	static async Delete(
		schemaRequest: TSchemaRequestDelete,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse | undefined>> {
		Assert.Var<TSchemaRequestDelete>(
			schemaRequest,
			z_TSchemaRequestDelete.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema, entity } = schemaRequest

		// check roles
		const schemaRoles = Schema._schemaRoles.get(schema)
		Roles.CheckPermission(userToken, schemaRoles, AUTH_PERMISSION.DELETE)

		const entityRoute = Schema._getEntityRoute(schema, entity)
		Assert.Var<TSchemaEntityRoute>(entityRoute, `${schema}: No route found for entity ${entity}`)

		const sourceDataProvider = SourceRegistry.Sources.get(entityRoute.sourceName)?.DataProvider
		Assert.Var<IDataProvider>(sourceDataProvider, sourceDataProvider !== undefined, "Source data provider not found")

		const _intResp = await sourceDataProvider.Delete(<TSchemaRequestDelete>{
			...schemaRequest,
			source: entityRoute.sourceName,
			sourceEntity: entityRoute.sourceEntityName,
		})

		return _intResp
	}

	@Logger.LogFunction(true)
	static async Update(
		schemaRequest: TSchemaRequestUpdate,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse | undefined>> {
		Assert.Var<TSchemaRequestUpdate>(
			schemaRequest,
			z_TSchemaRequestUpdate.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema, entity } = schemaRequest

		// check roles
		const schemaRoles = Schema._schemaRoles.get(schema)
		Roles.CheckPermission(userToken, schemaRoles, AUTH_PERMISSION.UPDATE)

		const entityRoute = Schema._getEntityRoute(schema, entity)
		Assert.Var<TSchemaEntityRoute>(entityRoute, `${schema}: No route found for entity ${entity}`)

		const sourceDataProvider = SourceRegistry.Sources.get(entityRoute.sourceName)?.DataProvider
		Assert.Var<IDataProvider>(sourceDataProvider, sourceDataProvider !== undefined, "Source data provider not found")

		const intResp = await sourceDataProvider.Update(<TSchemaRequestUpdate>{
			...schemaRequest,
			source: entityRoute.sourceName,
			entity: entityRoute.sourceEntityName ?? schemaRequest.entity,
		})

		return intResp
	}

	@Logger.LogFunction(true)
	static async Insert(
		schemaRequest: TSchemaRequestInsert,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse | undefined>> {
		Assert.Var<TSchemaRequestInsert>(
			schemaRequest,
			z_TSchemaRequestInsert.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema, entity } = schemaRequest

		// check roles
		const schemaRoles = Schema._schemaRoles.get(schema)
		Roles.CheckPermission(userToken, schemaRoles, AUTH_PERMISSION.CREATE)

		const entityRoute = Schema._getEntityRoute(schema, entity)
		Assert.Var<TSchemaEntityRoute>(entityRoute, `${schema}: No route found for entity ${entity}`)

		const sourceDataProvider = SourceRegistry.Sources.get(entityRoute.sourceName)?.DataProvider
		Assert.Var<IDataProvider>(sourceDataProvider, sourceDataProvider !== undefined, "Source data provider not found")

		const intResp = await sourceDataProvider.Insert(<TSchemaRequestInsert>{
			...schemaRequest,
			source: entityRoute.sourceName,
			entity: entityRoute.sourceEntityName ?? schemaRequest.entity,
		})

		return intResp
	}

	@Logger.LogFunction(true)
	static async ListEntities(
		schemaRequest: TSchemaRequestListEntities,
		userToken?: TUserTokenInfo,
	): Promise<TInternalResponse<TSchemaResponse | undefined>> {
		Assert.Var<TSchemaRequestListEntities>(
			schemaRequest,
			z_TSchemaRequestListEntities.safeParse(schemaRequest).success,
			`Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
			new HttpErrorBadRequest(),
		)

		const { schema } = schemaRequest

		// check roles
		const schemaRoles = Schema._schemaRoles.get(schema)
		Roles.CheckPermission(userToken, schemaRoles, AUTH_PERMISSION.LIST)

		const schemaEntities = Schema._schemaRoutes.get(schema)

		if (!schemaEntities) {
			throw new HttpErrorNotFound(`No entities found for schema ${schema}`)
		}

		const entities = new DataTable(schema)

		await entities.RowsSet()

		if (schemaEntities.has("*")) {
			const _source = schemaEntities.get("*")!.sourceName

			const sourceDataProvider = SourceRegistry.Sources.get(_source)?.DataProvider
			Assert.Var<IDataProvider>(sourceDataProvider, sourceDataProvider !== undefined, "Source data provider not found")

			const _intResp = await sourceDataProvider.ListEntities(<TSchemaRequestListEntities>{
				...schemaRequest,
				source: _source,
			})

			if (_intResp?.Body?.data) {
				await entities.RowsAdd(await _intResp?.Body?.data.Rows())
			}
		}

		// add declared entities
		for (const [entity] of schemaEntities) {
			if (entity !== "*") {
				await entities.RowsAdd({ name: entity })
			}
		}

		const schemaResponse: TSchemaResponse = {
			schema,
			status: HTTP_STATUS_CODE.OK,
			data: entities,
		}

		return HttpResponse.Ok(schemaResponse)
	}

	// TODO: refactor
	// static GetEntitiesSources(schema: string): TEntitiesMap {
	// 	const entities: TEntitiesMap = new Map()
	// 	const schemaParams = Schema._schemaParams[schema]

	// 	if (schemaParams?.source)
	// 		entities.set("*", {
	// 			source: schemaParams.source,
	// 			database: ConfigManager.Get<string | undefined>(`sources.${schemaParams.source}.database`),
	// 		})

	// 	if (schemaParams?.entities)
	// 		forEach(schemaParams.entities, (entityConfig: U__schemas_schema_entities_entity, entity: string) => {
	// 			entities.set(entity, {
	// 				source: entityConfig.source,
	// 				database: ConfigManager.Get<string | undefined>(`sources.${entityConfig.source}.database`),
	// 			})
	// 		})

	// 	return entities
	// }

	// static GetSchemaConfig(schema: string): U__schemas_schema {
	// 	const schemaConfig = ConfigManager.Get<U__schemas_schema>(`schemas.${schema}`)
	// 	if (!Schema._schemaParams?.has(schema))
	// 		throw new HttpErrorNotFound(`Schema '${schema}' not found`)

	// 	return schemaConfig
	// }
}
