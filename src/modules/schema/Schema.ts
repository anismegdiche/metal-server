//
//
//
import { forEach, has } from "lodash-es"
//
import type { TJson } from '../../types/TJson'
import { Assert } from '../../utils/Assert'
import { DataTableUtils } from "../../utils/DataTableUtils"
import { JsonUtils } from "../../utils/JsonUtils"
import { Logger } from '../../utils/Logger'
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { ConfigManager } from '../core/ConfigManager'
import { HttpResponse } from "../core/HttpResponse"
import type { U_config_schemas_schema, U_config_schemas_schema_entities_entity } from "../core/types/U_config_schemas"
import { HttpErrorBadRequest, HttpErrorNotFound } from '../errors/HttpErrors'
import { Source } from "../source/Source"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import type { TSchemaRequest, TSchemaRequestBase, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from './types/TSchemaRequest'
import { z_TSchemaRequest, z_TSchemaRequestDelete, z_TSchemaRequestInsert, z_TSchemaRequestSelect, z_TSchemaRequestUpdate } from "./types/TSchemaRequest"
import type { TSchemaResponse } from './types/TSchemaResponse'
import { z_TSchemaResponse } from "./types/TSchemaResponse"


//
export type TSchemaRoute = {
    type: "source" | "nothing",
    routeName: string
    entity?: string
}

export type TSourceTypeExecuteParams = {
    source: string,
    entity: string,
    schemaRequest: TSchemaRequestSelect | TSchemaRequestUpdate | TSchemaRequestDelete | TSchemaRequestInsert,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    CrudFunction: Function
}

export type TEntitiesMap = Map<string, {
    source: string,
    database?: string
}>


//
export class Schema {

    sort?: string
    cache?: string
    //
    source?: string

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static fnCacheGet?: Function

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly SourceTypeCaseMap: Record<string, Function> = {
        'nothing': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await Schema.#NothingTodo(sourceTypeExecuteParams),
        'source': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CrudFunction()
    }

    static async #NothingTodo(sourceTypeExecuteParams: TSourceTypeExecuteParams): Promise<void> {
        const { schema, entity } = sourceTypeExecuteParams.schemaRequest
        Logger.Warn(`${schema}: Entity '${entity}' not found`)
        throw new HttpErrorNotFound(`${schema}: Entity '${entity}' not found`)
    }

    static async #MergeData(schemaResponse: TSchemaResponse, schemaResponseToMerge: TSchemaResponse | undefined): Promise<TSchemaResponse> {
        if (!schemaResponseToMerge)
            return schemaResponse

        const isSchemaResponseWithData = await schemaResponse?.data?.Count() > 0
        const isSchemaResponseToMergeWithData = await schemaResponseToMerge?.data?.Count() > 0

        // only schemaResponse got data
        if (isSchemaResponseWithData && !isSchemaResponseToMergeWithData)
            return schemaResponse

        // only schemaResponseToMerge got data
        if (!isSchemaResponseWithData && isSchemaResponseToMergeWithData)
            return <TSchemaResponse>{
                ...schemaResponseToMerge,
                schema: schemaResponse.schema,
                entity: schemaResponse.entity,
                status: schemaResponseToMerge.status
            }

        // both got data
        if (isSchemaResponseWithData && isSchemaResponseToMergeWithData)
            return <TSchemaResponse>{
                ...schemaResponse,
                data: await schemaResponse.data.RowsAdd(
                    await schemaResponseToMerge.data.Rows()
                )
            }

        // anything else
        return schemaResponse
    }

    @Logger.LogFunction(true)
    static IsSchemaRequest(schemaRequest: unknown): schemaRequest is TSchemaRequest {
        return z_TSchemaRequest.safeParse(schemaRequest).success;
    }

    static IsSchemaRequestSelect(schemaRequest: unknown): schemaRequest is TSchemaRequestSelect {
        return z_TSchemaRequestSelect.safeParse(schemaRequest).success;
    }

    static IsSchemaRequestUpdate(schemaRequest: unknown): schemaRequest is TSchemaRequestUpdate {
        return z_TSchemaRequestUpdate.safeParse(schemaRequest).success;
    }

    static IsSchemaRequestInsert(schemaRequest: unknown): schemaRequest is TSchemaRequestInsert {
        return z_TSchemaRequestInsert.safeParse(schemaRequest).success;
    }

    static IsSchemaRequestDelete(schemaRequest: unknown): schemaRequest is TSchemaRequestDelete {
        return z_TSchemaRequestDelete.safeParse(schemaRequest).success;
    }

    @Logger.LogFunction(true)
    static IsSchemaResponse(schemaResponse: unknown): schemaResponse is TSchemaResponse {
        return z_TSchemaResponse.safeParse(schemaResponse).success;
    }

    //XXX @Logger.LogFunction(true)
    //XXX static IsSchemaResponseWithData(schemaResponse: TSchemaResponse): schemaResponse is TSchemaResponse {
    //XXX     return z_TSchemaResponse.safeParse(schemaResponse).success && DataTable.Is(schemaResponse.data)
    //XXX }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static Init(fnCacheGet: Function) {
        Schema.fnCacheGet = fnCacheGet
    }

    @Logger.LogFunction(true)
    static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {

        const { schema } = schemaRequest

        // check if schema exists in config file
        if (!ConfigManager.Has('schemas')) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            throw new HttpErrorNotFound(`section 'schemas' not found in configuration`)
        }

        // check if schema exists
        if (!ConfigManager.Get<TJson>(`schemas.${schema}`)) {
            Logger.Warn(`schema '${schema}' not found in configuration`)
            throw new HttpErrorNotFound(`schema '${schema}' not found in configuration`)
        }
    }

    //FIXME rewrite with GetEntitiesSources
    @Logger.LogFunction(true)
    static GetRoute(schema: string, entity: string, schemaConfig: any): TSchemaRoute {

        const nothingToDoSchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities.*
        if (has(schemaConfig, `entities.${entity}`)) {

            const _schemaEntityConfig: TSchemaRequest = JsonUtils.Get(schemaConfig.entities, entity)

            if (_schemaEntityConfig === undefined) {
                Logger.Warn(`Entity '${entity}' not found in schema '${schema}'`)
                return nothingToDoSchemaRoute
            }

            const { source: _source, entity: _entity } = _schemaEntityConfig as TSchemaRequestBase

            // schema.entities.*.source
            if (_source) {
                if (!ConfigManager.Has(`sources.${_source}`)) {
                    Logger.Warn(`Source not found for entity '${entity}'`)
                    return nothingToDoSchemaRoute
                }
                return {
                    type: 'source',
                    routeName: _source,
                    entity: _entity
                }
            }
        }

        // schema.source
        if (schemaConfig?.source) {
            if (!ConfigManager.Has(`sources.${schemaConfig.source}`)) {
                Logger.Warn(`Source not found for schema '${schema}'`)
                return nothingToDoSchemaRoute
            }
            return {
                type: 'source',
                routeName: schemaConfig.source,
                entity
            }
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`)
        return nothingToDoSchemaRoute
    }

    @Logger.LogFunction(true)
    static async Select(schemaRequest: TSchemaRequestSelect, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        Assert.Var<Function>(Schema.fnCacheGet, Schema.fnCacheGet !== undefined, 'Schema.fnCacheGet is not initialized')
        Assert.Var<TSchemaRequestSelect>(schemaRequest,
            Schema.IsSchemaRequestSelect(schemaRequest),
            `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
            new HttpErrorBadRequest()
        )

        // check roles
        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.READ)


        // check ofr cache before return
        const cachedData = await Schema.fnCacheGet(schemaRequest, userToken)
            .catch(undefined)

        if (cachedData)
            return cachedData


        //
        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return Schema.SourceTypeCaseMap[schemaRoute.type]!(<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                const _intResp = await Source.Sources.get(schemaRoute.routeName)!.DataProvider.Select(<TSchemaRequestSelect>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })

                if (!_intResp.Body)
                    return _intResp

                await _intResp.Body.data.FieldsSet()

                // Anonymizer
                if (schemaConfig?.anonymize && Schema.IsSchemaResponse(_intResp.Body) && (await _intResp.Body.data.Count()) > 0) {
                    _intResp.Body.data = await DataTableUtils.Anonymize(
                        _intResp.Body.data,
                        schemaConfig.anonymize
                    )
                }
                return _intResp
            }
        })
    }

    @Logger.LogFunction(true)
    static async Delete(schemaRequest: TSchemaRequestDelete, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestDelete>(schemaRequest,
            Schema.IsSchemaRequestDelete(schemaRequest),
            `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
            new HttpErrorBadRequest()
        )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.DELETE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return Schema.SourceTypeCaseMap[schemaRoute.type]!(<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return Source.Sources.get(schemaRoute.routeName)!.DataProvider.Delete(<TSchemaRequestDelete>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction(true)
    static async Update(schemaRequest: TSchemaRequestUpdate, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestUpdate>(schemaRequest,
            Schema.IsSchemaRequestUpdate(schemaRequest),
            `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
            new HttpErrorBadRequest()
        )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.UPDATE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return Schema.SourceTypeCaseMap[schemaRoute.type]!(<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return Source.Sources.get(schemaRoute.routeName)!.DataProvider.Update(<TSchemaRequestUpdate>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction(true)
    static async Insert(schemaRequest: TSchemaRequestInsert, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestInsert>(schemaRequest,
            Schema.IsSchemaRequestInsert(schemaRequest),
            `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
            new HttpErrorBadRequest()
        )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.CREATE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return Schema.SourceTypeCaseMap[schemaRoute.type]!(<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return Source.Sources.get(schemaRoute.routeName)!.DataProvider.Insert(<TSchemaRequestInsert>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction(true)
    static async ListEntities(schemaRequest: TSchemaRequestListEntities, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {
        const { schema } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.LIST)

        const entitiesSources = Schema.GetEntitiesSources(schema)

        let schemaResponse = {} as TSchemaResponse

        if (entitiesSources.has("*")) {
            const _source = (<U_config_schemas_schema_entities_entity>entitiesSources.get("*")).source
            const _intResp = await Source.Sources.get(_source)!.DataProvider.ListEntities(<TSchemaRequestListEntities>{
                ...schemaRequest,
                source: _source
            })
            schemaResponse = <TSchemaResponse>_intResp.Body
            entitiesSources.delete("*")
        }

        for (const [entity, entitySource] of entitiesSources) {
            const _source = (<U_config_schemas_schema_entities_entity>entitySource).source
            if (Schema.IsSchemaResponse(schemaResponse) && (await schemaResponse.data.Count()) > 0)
                await schemaResponse.data.RowsDelete(`name = '${entity}'`)

            const _intResp = await Source.Sources.get(_source)!.DataProvider.ListEntities(<TSchemaRequestListEntities>{
                ...schemaRequest,
                source: _source
            })

            if (_intResp.Body && Schema.IsSchemaResponse(_intResp.Body) && (await _intResp.Body.data.Count()) > 0) {
                using _data = _intResp.Body.data
                schemaResponse = await Schema.#MergeData(schemaResponse, _intResp.Body)
            }
        }
        return HttpResponse.Ok(schemaResponse)
    }

    static GetEntitiesSources(schema: string): TEntitiesMap {

        const entities: TEntitiesMap = new Map()
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (schemaConfig?.source)
            entities.set("*", {
                source: schemaConfig.source,
                database: ConfigManager.Get<string | undefined>(`sources.${schemaConfig.source}.database`)
            })

        if (schemaConfig?.entities)
            forEach(schemaConfig.entities, (entityConfig: U_config_schemas_schema_entities_entity, entity: string) => {
                entities.set(entity, {
                    source: entityConfig.source,
                    database: ConfigManager.Get<string | undefined>(`sources.${entityConfig.source}.database`)
                })
            })

        return entities
    }

    static GetSchemaConfig(schema: string): U_config_schemas_schema {
        const schemaConfig = ConfigManager.Get<U_config_schemas_schema>(`schemas.${schema}`)
        if (!schemaConfig)
            throw new HttpErrorNotFound(`Schema '${schema}' not found`)

        return schemaConfig
    }
}