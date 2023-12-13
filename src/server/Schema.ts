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
    Type: "source" | "nothing",
    RouteName: string
    EntityName?: string
}

export type TEntityTypeExecuteParams = {
    SourceName: string,
    EntityName: string,
    SchemaRequest: TSchemaRequest,
    CRUDOperation: Function
}

export class Schema {

    public static EntityTypeExecute: Record<string, Function> = {
        'nothing': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await Schema.NothingTodo(entityTypeExecuteParams),
        'source': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await entityTypeExecuteParams.CRUDOperation()
    }

    static async IsExist(schemaRequest: TSchemaRequest): Promise<boolean> {
        Logger.Debug(`Schema.IsExist: ${JSON.stringify(schemaRequest)}`)

        const { schema } = schemaRequest
        
        // check if schema exists in config file
        if (!Config.Has("schemas")) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            return false
        }

        // check if schema exists
        if (!Config.Has(`schemas.${schema}`)) {
            Logger.Warn(`schema '${schema}' not found in configuration`)
            return false
        }
        return true
    }

    static async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Select: ${JSON.stringify(schemaRequest)}`)

        const { schema, entity } = schemaRequest
        const schemaConfig = Config.Get(`schemas.${schema}`)
        const schemaRoute = Schema.GetRoute(schema, schemaConfig, entity)

        return await Schema.EntityTypeExecute[schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: schemaRoute.RouteName,
            EntityName: schemaRoute.EntityName,
            SchemaRequest: schemaRequest,
            CRUDOperation: async () => {
                const source = schemaRoute.RouteName
                return await Source.Sources[source].Select({
                    ...schemaRequest,
                    source
                })
            }
        })
    }

    static async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Delete: ${JSON.stringify(schemaRequest)}`)

        const { schema, entity } = schemaRequest
        const schemaConfig = Config.Get(`schemas.${schema}`)
        const schemaRoute = Schema.GetRoute(schema, schemaConfig, entity)

        return await Schema.EntityTypeExecute[schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: schemaRoute.RouteName,
            EntityName: schemaRoute.EntityName,
            SchemaRequest: schemaRequest,
            CRUDOperation: async () => {
                const source = schemaRoute.RouteName
                return await Source.Sources[source].Delete({
                    ...schemaRequest,
                    source
                })
            }
        })
    }
    static async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Update: ${JSON.stringify(schemaRequest)}`)

        const { schema, entity } = schemaRequest
        const schemaConfig = Config.Get(`schemas.${schema}`)
        const schemaRoute = Schema.GetRoute(schema, schemaConfig, entity)

        return await Schema.EntityTypeExecute[schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: schemaRoute.RouteName,
            EntityName: schemaRoute.EntityName,
            SchemaRequest: schemaRequest,
            CRUDOperation: async () => {
                const source = schemaRoute.RouteName
                return await Source.Sources[source].Update({
                    ...schemaRequest,
                    source
                })
            }
        })
    }

    static async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Schema.Insert: ${JSON.stringify(schemaRequest)}`)

        const { schema, entity } = schemaRequest
        const schemaConfig: TJson = Config.Get(`schemas.${schema}`)
        const schemaRoute = Schema.GetRoute(schema, schemaConfig, entity)

        return await Schema.EntityTypeExecute[schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: schemaRoute.RouteName,
            EntityName: schemaRoute.EntityName,
            SchemaRequest: schemaRequest,
            CRUDOperation: async () => {
                const source = schemaRoute.RouteName
                return await Source.Sources[source].Insert({
                    ...schemaRequest,
                    source
                })
            }
        })
    }

    static async NothingTodo(entityTypeExecuteParams: TEntityTypeExecuteParams) {
        Logger.Warn(`Nothing to do in schema '${entityTypeExecuteParams.SchemaRequest.schema}'`)
        const { schema, entity } = entityTypeExecuteParams.SchemaRequest
        return <TSchemaResponseNoData>{
            schema,
            entity,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }
    }

    static GetRoute(schemaName: string, schemaConfig: any, entityName: string): TSchemaRoute {

        const _EmptySchemaRoute: TSchemaRoute = {
            Type: 'nothing',
            RouteName: ''
        }

        // schema.entities
        if (_.has(schemaConfig, 'entities')) {
            const __schemaEntityConfig = _.get(schemaConfig.entities, entityName)

            // schema.entities.<entity>.source
            if (_.has(__schemaEntityConfig, 'source')) {
                if (!Config.Configuration?.sources[__schemaEntityConfig.source]) {
                    Logger.Warn(`Source not found for entity '${entityName}'`)
                    return _EmptySchemaRoute
                }
                return <TSchemaRoute>{
                    Type: 'source',
                    RouteName: __schemaEntityConfig.source,
                    EntityName: entityName
                }
            }
        }

        // schema.source
        if (_.has(schemaConfig, 'source')) {
            if (!Config.Configuration?.sources[schemaConfig.source]) {
                Logger.Warn(`Source not found for schema '${schemaName}'`)
                return _EmptySchemaRoute
            }
            return <TSchemaRoute>{
                Type: 'source',
                RouteName: schemaConfig.source,
                EntityName: entityName
            }
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`)
        return _EmptySchemaRoute
    }

    //TODO: to migrate to GetRoute
    static GetSource(schemaConfig: any, schemaRequest: TSchemaRequest): string | undefined {

        //case entities
        const entitySource = _.get(schemaConfig, `entities[${schemaRequest.entity}].source`)
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
