//
//
//
import _ from 'lodash'
//
import { Source } from "../source/Source"
import { Logger } from '../../utils/Logger'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from './types/TSchemaRequest'
import { TSchemaResponse } from './types/TSchemaResponse'
import { HttpErrorBadRequest, HttpErrorNotFound } from '../errors/HttpErrors'
import { TypeUtils } from '../../utils/TypeUtils'
import { StringUtils } from '../../utils/StringUtils'
import { ConfigManager } from '../core/ConfigManager'
import { TConfigSchema, TConfigSchemaEntity } from '../core/types/TConfig'
import { TInternalResponse } from "./types/TInternalResponse"
import { HttpResponse } from "../core/HttpResponse"
import { AUTH_PERMISSION } from "../auth/@consts"
import { Roles } from "../auth/Roles"
import { TUserTokenInfo } from "../auth/@types"
import { Assert } from '../../utils/Assert'
import { JsonUtils } from "../../utils/JsonUtils"
import { TJson } from '../../types/TJson'
import { Validator } from '../../utils/Validator'

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

    static #MergeData(schemaResponse: TSchemaResponse, schemaResponseToMerge: TSchemaResponse | undefined): TSchemaResponse {
        if (!schemaResponseToMerge)
            return schemaResponse

        const isSchemaResponseWithData = schemaResponse?.data?.Rows?.length > 0
        const isSchemaResponseToMergeWithData = schemaResponse?.data?.Rows?.length > 0

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
                data: schemaResponse.data.AddRows(
                    schemaResponseToMerge.data.Rows
                )
            }

        // anything else
        return schemaResponse
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static Init(fnCacheGet: Function) {
        Schema.fnCacheGet = fnCacheGet
    }

    @Logger.LogFunction()
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
    @Logger.LogFunction()
    static GetRoute(schema: string, entity: string, schemaConfig: any): TSchemaRoute {

        const nothingToDoSchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities.*
        if (_.has(schemaConfig, `entities.${entity}`)) {

            const _schemaEntityConfig: TSchemaRequest = JsonUtils.Get(schemaConfig.entities, entity)

            if (_schemaEntityConfig === undefined) {
                Logger.Warn(`Entity '${entity}' not found in schema '${schema}'`)
                return nothingToDoSchemaRoute
            }

            const { source: _source, entity: _entity } = _schemaEntityConfig

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

    @Logger.LogFunction()
    static async Select(schemaRequest: TSchemaRequestSelect, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {
        
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        Assert.Var<Function>(Schema.fnCacheGet, Schema.fnCacheGet !== undefined, 'Schema.fnCacheGet is not initialized')
        Assert.Var<TSchemaRequestSelect>(schemaRequest, 
            TypeUtils.IsSchemaRequestSelect(schemaRequest),
             `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
             new HttpErrorBadRequest()
            )

        const cachedData = await Schema.fnCacheGet(schemaRequest, userToken)
            .then()
            .catch(undefined)

        if (cachedData)
            return cachedData

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.READ)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        // Anonymizer
        let isAnonymize = false
        let fieldsToAnonymize: string[] = []
        if (schemaConfig?.anonymize) {
            isAnonymize = true
            fieldsToAnonymize = StringUtils.Split(schemaConfig.anonymize, ",")
        }
        //

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
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

                // Anonymizer
                if (isAnonymize && TypeUtils.IsSchemaResponseWithData(_intResp.Body)) {
                    (_intResp.Body).data.Anonymize(fieldsToAnonymize)
                }
                return _intResp
            }
        })
    }

    @Logger.LogFunction()
    static async Delete(schemaRequest: TSchemaRequestDelete, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestDelete>(schemaRequest, 
            Validator.SchemaRequestDelete(schemaRequest),
             `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
             new HttpErrorBadRequest()
            )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.DELETE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.DataProvider.Delete(<TSchemaRequestDelete>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Update(schemaRequest: TSchemaRequestUpdate, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestUpdate>(schemaRequest, 
            Validator.SchemaRequestUpdate(schemaRequest),
             `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
             new HttpErrorBadRequest()
            )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.UPDATE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.DataProvider.Update(<TSchemaRequestUpdate>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Insert(schemaRequest: TSchemaRequestInsert, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<TSchemaRequestInsert>(schemaRequest, 
            Validator.SchemaRequestInsert(schemaRequest),
             `Bad arguments passed: ${JSON.stringify(schemaRequest)}`,
             new HttpErrorBadRequest()
            )

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.CREATE)

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.DataProvider.Insert(<TSchemaRequestInsert>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async ListEntities(schemaRequest: TSchemaRequest, userToken?: TUserTokenInfo): Promise<TInternalResponse<TSchemaResponse>> {
        const { schema } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        Roles.CheckPermission(userToken, schemaConfig?.roles, AUTH_PERMISSION.LIST)

        const entitiesSources = Schema.GetEntitiesSources(schema)

        let schemaResponse = {} as TSchemaResponse

        if (entitiesSources.has("*")) {
            const _source = (<TConfigSchemaEntity>entitiesSources.get("*")).source
            const _intResp = await Source.Sources.get(_source)!.DataProvider.ListEntities(<TSchemaRequestListEntities>{
                ...schemaRequest,
                source: _source
            })
            schemaResponse = <TSchemaResponse>_intResp.Body
            entitiesSources.delete("*")
        }

        for await (const [entity, entitySource] of entitiesSources) {
            const _source = (<TConfigSchemaEntity>entitySource).source
            if (TypeUtils.IsSchemaResponseWithData(schemaResponse))
                schemaResponse.data.DeleteRows(`name = '${entity}'`)

            const _intResp = await Source.Sources.get(_source)!.DataProvider.ListEntities(<TSchemaRequestListEntities>{
                ...schemaRequest,
                source: _source
            })

            Schema.#MergeData(schemaResponse, <TSchemaResponse>_intResp.Body)
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
            _.forEach(schemaConfig.entities, (entityConfig: TConfigSchemaEntity, entity: string) => {
                entities.set(entity, {
                    source: entityConfig.source,
                    database: ConfigManager.Get<string | undefined>(`sources.${entityConfig.source}.database`)
                })
            })

        return entities
    }

    static GetSchemaConfig(schema: string): TConfigSchema {
        const schemaConfig = ConfigManager.Get<TConfigSchema>(`schemas.${schema}`)
        if (!schemaConfig)
            throw new HttpErrorNotFound(`Schema '${schema}' not found`)

        return schemaConfig
    }
}