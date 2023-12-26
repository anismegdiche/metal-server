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

export type TSchemaRoute = {
    type: "source" | "nothing",
    routeName: string
    entityName?: string
}

export type TSourceTypeExecuteParams = {
    sourceName: string,
    entityName: string,
    schemaRequest: TSchemaRequest,
    CRUDFunction: Function
}

export class Schema {

    public static SourceTypeCaseMap: Record<string, Function> = {
        'nothing': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await Schema.NothingTodo(sourceTypeExecuteParams),
        'source': async (sourceTypeExecuteParams: TSourceTypeExecuteParams) => await sourceTypeExecuteParams.CRUDFunction()
    }

    static async IsExist(schemaRequest: TSchemaRequest): Promise<boolean> {
        Logger.Debug(`Schema.IsExist: ${JSON.stringify(schemaRequest)}`)

        const { schemaName } = schemaRequest

        // check if schema exists in config file
        if (!Config.Has("schemas")) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            return false
        }

        // check if schema exists
        if (!Config.Has(`schemas.${schemaName}`)) {
            Logger.Warn(`schema '${schemaName}' not found in configuration`)
            return false
        }
        return true
    }

    static async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Select: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, schemaConfig, entityName)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CRUDFunction: async () => {
                const source = schemaRoute.routeName
                return await Source.Sources[source].Select({
                    ...schemaRequest,
                    sourceName: source
                })
            }
        })
    }

    static async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Delete: ${JSON.stringify(schemaRequest)}`)

        const { schemaName, entityName } = schemaRequest
        const schemaConfig = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, schemaConfig, entityName)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CRUDFunction: async () => {
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
        const schemaConfig = Config.Get(`schemas.${schemaName}`)
        const schemaRoute = Schema.GetRoute(schemaName, schemaConfig, entityName)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CRUDFunction: async () => {
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
        const schemaRoute = Schema.GetRoute(schemaName, schemaConfig, entityName)

        return await Schema.SourceTypeCaseMap[schemaRoute.type](<TSourceTypeExecuteParams>{
            sourceName: schemaRoute.routeName,
            entityName: schemaRoute.entityName,
            schemaRequest,
            CRUDFunction: async () => {
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

    static GetRoute(schemaName: string, schemaConfig: any, entityName: string): TSchemaRoute {

        const _emptySchemaRoute: TSchemaRoute = {
            type: 'nothing',
            routeName: ''
        }

        // schema.entities
        if (_.has(schemaConfig, 'entities')) {
            const __schemaEntityConfig = _.get(schemaConfig.entities, entityName)

            // schema.entities.<entity>.source
            if (_.has(__schemaEntityConfig, 'source')) {
                if (!Config.Configuration?.sources[__schemaEntityConfig.source]) {
                    Logger.Warn(`Source not found for entity '${entityName}'`)
                    return _emptySchemaRoute
                }
                return {
                    type: 'source',
                    routeName: __schemaEntityConfig.source,
                    entityName
                }
            }
        }

        // schema.source
        if (_.has(schemaConfig, 'source')) {
            if (!Config.Configuration?.sources[schemaConfig.source]) {
                Logger.Warn(`Source not found for schema '${schemaName}'`)
                return _emptySchemaRoute
            }
            return {
                type: 'source',
                routeName: schemaConfig.source,
                entityName
            }
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`)
        return _emptySchemaRoute
    }

    //TODO: to migrate to GetRoute
    static GetSource(schemaConfig: any, schemaRequest: TSchemaRequest): string | undefined {

        //case entities
        const entitySource = _.get(schemaConfig, `entities[${schemaRequest.entityName}].source`)
        if (!_.isEmpty(entitySource) && Source.Sources[entitySource]) {
            return entitySource
        }

        // case source
        const schemaSource = schemaConfig?.source
        if (schemaSource && Config.Configuration?.sources[schemaSource]) {
            return schemaSource
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`)
        return undefined
    }
}
