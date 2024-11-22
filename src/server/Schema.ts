//
//
//
//
//
import _ from 'lodash'
import typia from "typia"
//
import { Source } from "./Source"
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from '../types/TSchemaRequest'
import { TSchemaResponse } from '../types/TSchemaResponse'
import { HttpErrorBadRequest, HttpErrorForbidden, HttpErrorNotFound } from './HttpErrors'
import { TypeHelper } from '../lib/TypeHelper'
import { StringHelper } from '../lib/StringHelper'
import { TConfigSchema, TConfigSchemaEntity } from "../types/TConfig"
import { TInternalResponse } from "../types/TInternalResponse"
import { HttpResponse } from "./HttpResponse"
import { TUserTokenInfo } from "./User"
import { PERMISSION, Roles } from "./Roles"

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

    @Logger.LogFunction()
    static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {

        const { schema } = schemaRequest

        // check if schema exists in config file
        if (!Config.Configuration.schemas) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            throw new HttpErrorNotFound(`section 'schemas' not found in configuration`)
        }

        // check if schema exists
        if (!Config.Configuration.schemas[schema]) {
            Logger.Warn(`schema '${schema}' not found in configuration`)
            throw new HttpErrorNotFound(`schema '${schema}' not found in configuration`)
        }
    }

    //TODO rewrite with GetEntitiesSources
    @Logger.LogFunction()
    static GetRoute(schema: string, entity: string, schemaConfig: any): TSchemaRoute {

        const nothingToDoSchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities.*
        if (_.has(schemaConfig, `entities.${entity}`)) {
            // eslint-disable-next-line you-dont-need-lodash-underscore/get
            const _schemaEntityConfig = _.get(schemaConfig.entities, entity)

            if (_schemaEntityConfig === undefined) {
                Logger.Warn(`Entity '${entity}' not found in schema '${schema}'`)
                return nothingToDoSchemaRoute
            }

            const { source: _source, entity: _entity } = _schemaEntityConfig

            // schema.entities.*.source
            if (_source) {
                if (!Config.Has(`sources.${_source}`)) {
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
            if (!Config.Has(`sources.${schemaConfig.source}`)) {
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
    static async Select(schemaRequest: TSchemaRequestSelect, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse>> {


        TypeHelper.Validate(typia.validateEquals<TSchemaRequestSelect>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (!Roles.HasPermission(userToken, schemaConfig?.roles, PERMISSION.READ))
            throw new HttpErrorForbidden('Permission denied')

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)
        // Anonymizer
        let isAnonymize = false
        let fieldsToAnonymize: string[] = []
        if (schemaConfig?.anonymize) {
            isAnonymize = true
            fieldsToAnonymize = StringHelper.Split(schemaConfig.anonymize, ",")
        }
        //

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                const _internalResponse = await Source.Sources.get(schemaRoute.routeName)!.Select(<TSchemaRequestSelect>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })

                if (!_internalResponse.Body)
                    return _internalResponse

                // Anonymizer
                if (isAnonymize && TypeHelper.IsSchemaResponseData(_internalResponse.Body)) {
                    (_internalResponse.Body).data.AnonymizeFields(fieldsToAnonymize)
                }
                return _internalResponse
            }
        })
    }

    @Logger.LogFunction()
    static async Delete(schemaRequest: TSchemaRequestDelete, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse>> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestDelete>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (!Roles.HasPermission(userToken, schemaConfig?.roles, PERMISSION.DELETE))
            throw new HttpErrorForbidden('Permission denied')

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.Delete(<TSchemaRequestDelete>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Update(schemaRequest: TSchemaRequestUpdate, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse>> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestUpdate>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (!Roles.HasPermission(userToken, schemaConfig?.roles, PERMISSION.UPDATE))
            throw new HttpErrorForbidden('Permission denied')

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.Update(<TSchemaRequestUpdate>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Insert(schemaRequest: TSchemaRequestInsert, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse>> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestInsert>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schema, entity } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (!Roles.HasPermission(userToken, schemaConfig?.roles, PERMISSION.CREATE))
            throw new HttpErrorForbidden('Permission denied')

        const schemaRoute = Schema.GetRoute(schema, entity, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            source: schemaRoute.routeName,
            entity: schemaRoute.entity,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources.get(schemaRoute.routeName)!.Insert(<TSchemaRequestInsert>{
                    ...schemaRequest,
                    source: schemaRoute.routeName,
                    entity: schemaRoute.entity ?? schemaRequest.entity
                })
            }
        })
    }

    @Logger.LogFunction()
    static async ListEntities(schemaRequest: TSchemaRequest, userToken: TUserTokenInfo | undefined = undefined): Promise<TInternalResponse<TSchemaResponse>> {
        const { schema } = schemaRequest
        const schemaConfig = Schema.GetSchemaConfig(schema)
    
        if (!Roles.HasPermission(userToken, schemaConfig?.roles, PERMISSION.LIST))
            throw new HttpErrorForbidden('Permission denied')

        const entitiesSources = Schema.GetEntitiesSources(schema)

        let schemaResponse = {} as TSchemaResponse

        if (entitiesSources.has("*")) {
            const _source = (<TConfigSchemaEntity>entitiesSources.get("*")).source
            const _internalResponse = await Source.Sources.get(_source)!.ListEntities(schemaRequest)
            schemaResponse = <TSchemaResponse>_internalResponse.Body
            entitiesSources.delete("*")
        }

        for await (const [entity, entitySource] of entitiesSources) {
            const _source = (<TConfigSchemaEntity>entitySource).source
            if (TypeHelper.IsSchemaResponseData(schemaResponse))
                schemaResponse.data.DeleteRows(`name = '${entity}'`)

            const _internalResponse = await Source.Sources.get(_source)!.ListEntities(schemaRequest)

            Schema.#MergeData(schemaResponse, <TSchemaResponse>_internalResponse.Body)
        }
        return HttpResponse.Ok(schemaResponse)
    }

    static GetEntitiesSources(schema: string): TEntitiesMap {

        const entities: TEntitiesMap = new Map()
        const schemaConfig = Schema.GetSchemaConfig(schema)

        if (schemaConfig?.source)
            entities.set("*", {
                source: schemaConfig.source,
                database: Config.Get<string | undefined>(`sources.${schemaConfig.source}.database`)
            })

        if (schemaConfig?.entities)
            // eslint-disable-next-line you-dont-need-lodash-underscore/for-each
            _.forEach(schemaConfig.entities, (entityConfig: TConfigSchemaEntity, entity: string) => {
                entities.set(entity, {
                    source: entityConfig.source,
                    database: Config.Get<string | undefined>(`sources.${entityConfig.source}.database`)
                })
            })

        return entities
    }

    static GetSchemaConfig(schema: string): TConfigSchema {
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schema}`)
        if (!schemaConfig)
            throw new HttpErrorNotFound(`Schema '${schema}' not found`)

        return schemaConfig
    }
}