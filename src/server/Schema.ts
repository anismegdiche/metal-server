//
//
//
//
//
import _ from 'lodash'
//
import { Source } from "./Source"
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from '../types/TSchemaRequest'
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TJson } from '../types/TJson'
import { HttpErrorBadRequest, HttpErrorNotFound } from './HttpErrors'
import { TypeHelper } from '../lib/TypeHelper'
import { StringHelper } from '../lib/StringHelper'
import { TConfigSchema, TConfigSchemaEntity } from "../types/TConfig"
import typia from "typia"

export type TSchemaRoute = {
    type: "source" | "nothing",
    routeName: string
    entityName?: string
}

export type TSourceTypeExecuteParams = {
    sourceName: string,
    entityName: string,
    schemaRequest: TSchemaRequestSelect | TSchemaRequestUpdate | TSchemaRequestDelete | TSchemaRequestInsert,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    CrudFunction: Function
}

export type TEntitiesMap = Map<string, {
    sourceName: string,
    database?: string
}>

export class Schema {

    sort?: string
    cache?: string
    //
    sourceName?: string

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly SourceTypeCaseMap: Record<string, Function> = {
        'nothing': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await Schema.#NothingTodo(sourceTypeExecuteParams),
        'source': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CrudFunction()
    }

    @Logger.LogFunction()
    static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {

        const { schemaName } = schemaRequest

        // check if schema exists in config file
        if (!Config.Has("schemas")) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            throw new HttpErrorNotFound(`section 'schemas' not found in configuration`)
        }

        // check if schema exists
        if (!Config.Has(`schemas.${schemaName}`)) {
            Logger.Warn(`schema '${schemaName}' not found in configuration`)
            throw new HttpErrorNotFound(`schema '${schemaName}' not found in configuration`)
        }
    }

    //TODO: rewrite with GetEntitiesSources
    @Logger.LogFunction()
    static GetRoute(schemaName: string, entityName: string, schemaConfig: any): TSchemaRoute {

        const nothingToDoSchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities.*
        if (_.has(schemaConfig, `entities.${entityName}`)) {
            const _schemaEntityConfig = _.get(schemaConfig.entities, entityName)

            if (_schemaEntityConfig === undefined) {
                Logger.Warn(`Entity '${entityName}' not found in schema '${schemaName}'`)
                return nothingToDoSchemaRoute
            }

            const { sourceName: _sourceName, entityName: _entityName } = _schemaEntityConfig

            // schema.entities.*.sourceName
            if (_sourceName) {
                if (!Config.Has(`sources.${_sourceName}`)) {
                    Logger.Warn(`Source not found for entity '${entityName}'`)
                    return nothingToDoSchemaRoute
                }
                return {
                    type: 'source',
                    routeName: _sourceName,
                    entityName: _entityName
                }
            }
        }

        // schema.sourceName
        if (schemaConfig?.sourceName) {
            if (!Config.Has(`sources.${schemaConfig.sourceName}`)) {
                Logger.Warn(`Source not found for schema '${schemaName}'`)
                return nothingToDoSchemaRoute
            }
            return {
                type: 'source',
                routeName: schemaConfig.sourceName,
                entityName
            }
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`)
        return nothingToDoSchemaRoute
    }

    static async #NothingTodo(sourceTypeExecuteParams: TSourceTypeExecuteParams): Promise<TSchemaResponseNoData> {
        Logger.Warn(`Nothing to do in schema '${sourceTypeExecuteParams.schemaRequest.schemaName}'`)
        const { schemaName, entityName } = sourceTypeExecuteParams.schemaRequest
        return <TSchemaResponseNoData>{
            schemaName,
            entityName,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }
    }

    static #MergeData(schemaResponse: TSchemaResponse, schemaResponseToMerge: TSchemaResponse | undefined): TSchemaResponse {
        if (!schemaResponseToMerge)
            return schemaResponse

        // only schemaResponse got data
        if (TypeHelper.IsSchemaResponseData(schemaResponse) && !TypeHelper.IsSchemaResponseData(schemaResponseToMerge))
            return schemaResponse as TSchemaResponseData

        // only schemaResponseToMerge got data
        if (!TypeHelper.IsSchemaResponseData(schemaResponse) && TypeHelper.IsSchemaResponseData(schemaResponseToMerge))
            return <TSchemaResponseData>{
                ...schemaResponseToMerge,
                schemaName: schemaResponse.schemaName,
                entityName: schemaResponse.entityName,
                transaction: schemaResponse.transaction,
                result: schemaResponseToMerge.result,
                status: schemaResponseToMerge.status
            }

        // both got data
        if (TypeHelper.IsSchemaResponseData(schemaResponse) && TypeHelper.IsSchemaResponseData(schemaResponseToMerge))
            return <TSchemaResponseData>{
                ...schemaResponse,
                data: schemaResponse.data.AddRows(
                    schemaResponseToMerge.data.Rows
                )
            }

        // anything else
        return schemaResponse
    }


    @Logger.LogFunction()
    static async Select(schemaRequest: TSchemaRequestSelect): Promise<TSchemaResponse> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestSelect>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)
        // Anonymizer
        let isAnonymize = false
        let fieldsToAnonymize: string[] = []
        if (schemaConfig.anonymize) {
            isAnonymize = true
            fieldsToAnonymize = StringHelper.Split(schemaConfig.anonymize, ",")
        }
        //

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const _schemaresponse = await Source.Sources[schemaRoute.routeName].Select(<TSchemaRequestSelect>{
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
                // Anonymizer
                if (isAnonymize && TypeHelper.IsSchemaResponseData(_schemaresponse))
                    _schemaresponse.data.AnonymizeFields(fieldsToAnonymize)
                return _schemaresponse
            }
        })
    }

    @Logger.LogFunction()
    static async Delete(schemaRequest: TSchemaRequestDelete): Promise<TSchemaResponse> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestDelete>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Delete(<TSchemaRequestDelete>{
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Update(schemaRequest: TSchemaRequestUpdate): Promise<TSchemaResponse> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestUpdate>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Update(<TSchemaRequestUpdate>{
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }

    @Logger.LogFunction()
    static async Insert(schemaRequest: TSchemaRequestInsert): Promise<TSchemaResponse> {

        TypeHelper.Validate(typia.validateEquals<TSchemaRequestInsert>(schemaRequest),
            new HttpErrorBadRequest(`Bad arguments passed: ${JSON.stringify(schemaRequest)}`))

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Insert(<TSchemaRequestInsert>{
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }

    @Logger.LogFunction()
    static async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName } = schemaRequest
        const entitiesSources = Schema.GetEntitiesSources(schemaName)

        let schResp = {} as TSchemaResponse

        if (entitiesSources.has("*")) {
            const _source = (<TConfigSchemaEntity>entitiesSources.get("*")).sourceName
            schResp = await Source.Sources[_source].ListEntities(schemaRequest)
            entitiesSources.delete("*")
        }

        for await (const [entityName, entitySource] of entitiesSources) {
            const _source = (<TConfigSchemaEntity>entitySource).sourceName
            if (TypeHelper.IsSchemaResponseData(schResp))
                schResp.data.DeleteRows(`name = '${entityName}'`)
            const schRespToMerge = await Source.Sources[_source].ListEntities(schemaRequest)
                .catch(() => undefined)

            Schema.#MergeData(schResp, schRespToMerge)
        }
        return schResp
    }

    static GetEntitiesSources(schemaName: string): TEntitiesMap {
        
        const entities: TEntitiesMap = new Map()
        const schemaConfig = Config.Get<TConfigSchema>(`schemas.${schemaName}`)
        
        if (schemaConfig?.sourceName)
            entities.set("*", {
                sourceName: schemaConfig.sourceName,
                database: Config.Get<string | undefined>(`sources.${schemaConfig.sourceName}.database`)
            })

        if (schemaConfig?.entities)
            // eslint-disable-next-line you-dont-need-lodash-underscore/for-each
            _.forEach(schemaConfig.entities, (entityConfig: TConfigSchemaEntity, entity: string) => {
                entities.set(entity, {
                    sourceName: entityConfig.sourceName,
                    database: Config.Get<string | undefined>(`sources.${entityConfig.sourceName}.database`)
                })
            })
            
        return entities
    }
}