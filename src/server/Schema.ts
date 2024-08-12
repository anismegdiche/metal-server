//
//
//
//
//
import _ from 'lodash'
//
import { Source } from "./Source"
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TSchemaResponse, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TJson } from '../types/TJson'
import { HttpNotFoundError } from './HttpErrors'
import { TypeHelper } from '../lib/TypeHelper'
import { StringHelper } from '../lib/StringHelper'
import { JsonHelper } from '../lib/JsonHelper'

export type TSchemaRoute = {
    type: "source" | "nothing",
    routeName: string
    entityName?: string
}

export type TSourceTypeExecuteParams = {
    sourceName: string,
    entityName: string,
    schemaRequest: TSchemaRequest,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    CrudFunction: Function
}

export class Schema {

    sort?: string
    cache?: string
    //
    sourceName?: string

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static readonly SourceTypeCaseMap: Record<string, Function> = {
        'nothing': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await Schema.NothingTodo(sourceTypeExecuteParams),
        'source': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CrudFunction()
    }

    static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {
        Logger.Debug(`Schema.IsExists: ${JsonHelper.Stringify(schemaRequest)}`)

        const { schemaName } = schemaRequest

        // check if schema exists in config file
        if (!Config.Has("schemas")) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            throw new HttpNotFoundError(`section 'schemas' not found in configuration`)
        }

        // check if schema exists
        if (!Config.Has(`schemas.${schemaName}`)) {
            Logger.Warn(`schema '${schemaName}' not found in configuration`)
            throw new HttpNotFoundError(`schema '${schemaName}' not found in configuration`)
        }
    }

    static GetRoute(schemaName: string, entityName: string, schemaConfig: any): TSchemaRoute {

        const nothingToDoSchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities.<entity>
        if (_.has(schemaConfig, `entities.${entityName}`)) {
            const _schemaEntityConfig = _.get(schemaConfig.entities, entityName)

            if (_schemaEntityConfig === undefined) {
                Logger.Warn(`Entity '${entityName}' not found in schema '${schemaName}'`)
                return nothingToDoSchemaRoute
            }

            const { sourceName: _sourceName, entityName: _entityName } = _schemaEntityConfig

            // schema.entities.<entity>.sourceName
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

    static async NothingTodo(sourceTypeExecuteParams: TSourceTypeExecuteParams): Promise<TSchemaResponseNoData> {
        Logger.Warn(`Nothing to do in schema '${sourceTypeExecuteParams.schemaRequest.schemaName}'`)
        const { schemaName, entityName } = sourceTypeExecuteParams.schemaRequest
        return <TSchemaResponseNoData>{
            schemaName,
            entityName,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }
    }

    static async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Select: ${JsonHelper.Stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)
        // Anonymizer
        let isAnonymize = false
        let fieldsToAnonymize: string[] = []
        if (Config.Has(`schemas.${schemaName}.anonymize`)) {
            isAnonymize = true
            fieldsToAnonymize = StringHelper.Split(Config.Get(`schemas.${schemaName}.anonymize`), ",")
        }
        //

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const _schemaresponse = await Source.Sources[schemaRoute.routeName].Select({
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

    static async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Delete: ${JsonHelper.Stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Delete({
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }

    static async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Update: ${JsonHelper.Stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Update({
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }

    static async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Insert: ${JsonHelper.Stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                return await Source.Sources[schemaRoute.routeName].Insert({
                    ...schemaRequest,
                    sourceName: schemaRoute.routeName,
                    entityName: schemaRoute.entityName ?? schemaRequest.entityName
                })
            }
        })
    }
}