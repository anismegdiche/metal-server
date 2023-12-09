//
//
//
//
//
import _ from 'lodash'
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { TDataRequest } from '../types/TDataRequest'
import { Sources } from './Sources'
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { TDataResponseNoData } from '../types/TDataResponse'

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

export class Schemas {

    public static EntityTypeExecute: Record<string, Function> = {
        'nothing': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await Schemas.NothingTodo(entityTypeExecuteParams),
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

        let _EmptySchemaRoute: TSchemaRoute = {
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
        if (!_.isEmpty(entitySource) && Sources.Sources[entitySource]) {
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
}