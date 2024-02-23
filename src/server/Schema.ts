//
//
//
//
//
import _ from 'lodash'
import { Source } from "./Source"
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TSchemaResponse, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TJson } from '../types/TJson'
import { NotFoundError } from './HttpErrors'

export type TSchemaRoute = {
    type: "source" | "nothing",
    routeName: string
    entityName?: string
}

export type TSourceTypeExecuteParams = {
    sourceName: string,
    entityName: string,
    schemaRequest: TSchemaRequest,
    CrudFunction: Function
}

export class Schema {

    sort?: string
    cache?: string
    //
    sourceName?: string

    static SourceTypeCaseMap: Record<string, Function> = {
        'nothing': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await Schema.NothingTodo(sourceTypeExecuteParams),
        'source': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CrudFunction()
    }

    static async IsExists(schemaRequest: TSchemaRequest): Promise<void> {
        Logger.Debug(`Schema.IsExists: ${JSON.stringify(schemaRequest)}`)

        const { schemaName } = schemaRequest

        // check if schema exists in config file
        if (!Config.Has("schemas")) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            throw new NotFoundError(`section 'schemas' not found in configuration`)
        }

        // check if schema exists
        if (!Config.Has(`schemas.${schemaName}`)) {
            Logger.Warn(`schema '${schemaName}' not found in configuration`)
            throw new NotFoundError(`schema '${schemaName}' not found in configuration`)
        }
    }

    static async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Select: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const sourceName = schemaRoute.routeName
                return await Source.Sources[sourceName].Select({
                    ...schemaRequest,
                    sourceName
                })
            }
        })
    }

    static async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Delete: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const source = schemaRoute.routeName
                return await Source.Sources[source].Delete({
                    ...schemaRequest,
                    sourceName: source
                })
            }
        })
    }
    static async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Update: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const source = schemaRoute.routeName
                return await Source.Sources[source].Update({
                    ...schemaRequest,
                    sourceName: source
                })
            }
        })
    }

    static async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Insert: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, entityName, schemaConfig)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CrudFunction: async () => {
                const source = schemaRoute.routeName
                return await Source.Sources[source].Insert({
                    ...schemaRequest,
                    sourceName: source
                })
            }
        })
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

            const { sourceName: _sourceName } = _schemaEntityConfig

            // schema.entities.<entity>.sourceName
            if (_sourceName) {
                if (!Config.Has(`sources.${_sourceName}`)) {
                    Logger.Warn(`Source not found for entity '${entityName}'`)
                    return nothingToDoSchemaRoute
                }
                return {
                    type: 'source',
                    routeName: _sourceName,
                    entityName
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
}
