/* eslint-disable no-lonely-if */
//
//
//
//
//
import { Request } from 'express'

import { HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_TRANSACTION } from '../lib/Const'
import { TDataResponse, TDataResponseError } from '../types/TDataResponse'
import { Schemas, TEntityTypeExecuteParams } from '../interpreter/Schemas'
import { Convert } from '../lib/Convert'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { Sources } from '../interpreter/Sources'


export class Data {

    static async Select(req: Request): Promise<TDataResponse> {

        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Data.Select: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schemas[schema]

        const _schemaRoute = Schemas.GetRoute(schema, _schemaConfig, entity)

        return await Schemas.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Sources.Sources[_schemaRoute.RouteName].Select(_dataRequest)
            }
        })
    }

    static async Delete(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Data.Delete: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schemas[schema]

        const _schemaRoute = Schemas.GetRoute(schema, _schemaConfig, entity)

        // case plan
        if (_schemaRoute.Type === 'plan') {
            Logger.Error(`Data.Delete: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            return <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.DELETE,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return await Schemas.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Sources.Sources[_schemaRoute.RouteName].Delete(_dataRequest)
            }
        })
    }
    static async Update(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Data.Update: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schemas[schema]

        const _schemaRoute = Schemas.GetRoute(schema, _schemaConfig, entity)

        // case plan
        if (_schemaRoute.Type === 'plan') {
            Logger.Error(`Data.Update: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            return <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.UPDATE,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return await Schemas.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Sources.Sources[_schemaRoute.RouteName].Update(_dataRequest)
            }
        })
    }

    static async Insert(req: Request): Promise<TDataResponse> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        Logger.Debug(`Data.Insert: ${JSON.stringify(_dataRequest)}`)

        const _schemaConfig = Config.Configuration.schemas[schema]

        const _schemaRoute = Schemas.GetRoute(schema, _schemaConfig, entity)

        // case plan
        if (_schemaRoute.Type === 'plan') {
            Logger.Error(`Data.Insert: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            return <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.INSERT,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return await Schemas.EntityTypeExecute[_schemaRoute.Type](<TEntityTypeExecuteParams>{
            SourceName: _schemaRoute.RouteName,
            EntityName: _schemaRoute.EntityName,
            DataRequest: _dataRequest,
            CRUDOperation: async () => {
                return await Sources.Sources[_schemaRoute.RouteName].Insert(_dataRequest)
            }
        })
    }
}