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
import { Plans } from './Plans'
import { RESPONSE_RESULT, RESPONSE_STATUS } from '../lib/Const'
import { TDataResponseNoData } from '../types/TDataResponse'

export type TSchemaRoute = {
    Type: "source" | "plan" | "nothing",
    RouteName: string
    EntityName?: string | undefined
}

export type TEntityTypeExecuteParams = {
    SourceName: string,
    EntityName: string,
    DataRequest: TDataRequest,
    CRUDOperation: Function
}

export abstract class Schemas {

    public static EntityTypeExecute: Record<string, Function> = {
        'nothing': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => Schemas.NothingTodo(entityTypeExecuteParams),
        'source': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await entityTypeExecuteParams.CRUDOperation(),
        'plan': async (entityTypeExecuteParams: TEntityTypeExecuteParams) => await Plans.RenderTable(entityTypeExecuteParams.DataRequest.schema,  entityTypeExecuteParams.SourceName, entityTypeExecuteParams.EntityName)
    }

    static NothingTodo(entityTypeExecuteParams: TEntityTypeExecuteParams) {
        Logger.Warn(`Nothing to do in schema '${entityTypeExecuteParams.DataRequest.schema}'`)
        return <TDataResponseNoData>{
            schema: entityTypeExecuteParams.DataRequest.schema,
            entity: entityTypeExecuteParams.DataRequest.entity,
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

            // schema.entities.<entity>.plan
            if (_.has(__schemaEntityConfig, 'plan')) {
                if (!Config.Configuration?.plans[__schemaEntityConfig.plan]) {
                    Logger.Warn(`Plan not found for entity '${entityName}'`)
                    return _EmptySchemaRoute
                }
                return <TSchemaRoute>{
                    Type: 'plan',
                    RouteName: __schemaEntityConfig.plan,
                    EntityName: entityName
                }
            }

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

        // schema.plan
        if (_.has(schemaConfig, 'plan')) {
            if (!Config.Configuration?.plans[schemaConfig.plan]) {
                Logger.Warn(`Plan not found for schema '${schemaName}'`)
                return _EmptySchemaRoute
            }
            return <TSchemaRoute>{
                Type: 'plan',
                RouteName: schemaConfig.plan,
                EntityName: entityName
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