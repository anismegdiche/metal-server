//
//
//
//
//
import { Request } from "express"
import * as _ from 'lodash'
import { Source } from "../interpreter/Source"
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { Convert } from "../lib/Convert"
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { TDataRequest } from '../types/TDataRequest'
import { TDataResponse, TDataResponseNoData } from '../types/TDataResponse'

export type TSchemaRoute = {
    Type: "source" | "nothing",
    RouteName: string
    EntityName?: string
}

export type TEntityTypeExecuteParams = {
    SourceName: string,
    EntityName: string,
    DataRequest: TDataRequest,
    CRUDOperation: Function
}

export class Schema {

    public static EntityTypeExecute: Record<string, Function> = {
        'nothing': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await Schema.NothingTodo(entityTypeExecuteParams),
        'source': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await entityTypeExecuteParams.CRUDOperation()
    }

    static async NothingTodo(entityTypeExecuteParams: TEntityTypeExecuteParams) {
        Logger.Warn(`Nothing to do in schema '${entityTypeExecuteParams.DataRequest.schema}'`)
        const { schema, entity } = entityTypeExecuteParams.DataRequest
        return <TDataResponseNoData>{
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
    static GetSource(schemaConfig: any, dataRequest: TDataRequest): string | undefined {

        //case entities
        const entitySource = _.get(schemaConfig, `entities[${dataRequest.entity}].source`)
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

    //ROADMAP
    // static Create(schemaName: string) {
    //     global.Schemas[schemaName] = new DataBase(schemaName)
    // }

    //ROADMAP
    // static CreateAll() {
    //     for (const _schemaName in Config.Configuration.schemas) {
    //         if (_schemaName )
    //             this.Create(_schemaName)
    //     }
    // }

    static async IsExist(req: Request): Promise<boolean> {
        const dataRequest = Convert.RequestToDataRequest(req)
        const { schema } = dataRequest

        Logger.Debug(`Schema.IsExist: ${JSON.stringify(dataRequest)}`)

        // check if schema exists in config file
        if (Config.Configuration?.schema === undefined) {
            Logger.Warn(`section 'schema' not found in configuration`)
            return false
        }
        // check if schema exists
        if (!_.has(Config.Configuration.schema, schema)) {
            Logger.Warn(`schema '${schema}' not found in configuration`)
            return false
        }
        return true
    }

    static async Select(req: Request): Promise<TDataResponse> {
        const dataRequest = Convert.RequestToDataRequest(req)
        Logger.Debug(`Schema.Select: ${JSON.stringify(dataRequest)}`)

        const { schema, entity } = dataRequest
        const schemaConfig = Config.Configuration.schema[schema]
        const _schemaRoute = Schema.GetRoute(schema, schemaConfig, entity)

        return await Schema.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: dataRequest,
            CRUDOperation: async () => {
                return await Source.Sources[_schemaRoute.RouteName].Select(dataRequest)
            }
        })
    }

    static async Delete(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Schema.Delete: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schema[schema]

        const _schemaRoute = Schema.GetRoute(schema, _schemaConfig, entity)

        return await Schema.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Source.Sources[_schemaRoute.RouteName].Delete(_dataRequest)
            }
        })
    }
    static async Update(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Schema.Update: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schema[schema]

        const _schemaRoute = Schema.GetRoute(schema, _schemaConfig, entity)

        return await Schema.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Source.Sources[_schemaRoute.RouteName].Update(_dataRequest)
            }
        })
    }

    static async Insert(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Schema.Insert: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schema[schema]

        const _schemaRoute = Schema.GetRoute(schema, _schemaConfig, entity)

        return await Schema.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Source.Sources[_schemaRoute.RouteName].Insert(_dataRequest)
            }
        })
    }

}
