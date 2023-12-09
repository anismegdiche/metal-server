/* eslint-disable no-lonely-if */
//
//
//
//
//
import { Request } from 'express'
import _ from 'lodash'

import { TDataResponse } from '../types/TDataResponse'
import { Schemas, TEntityTypeExecuteParams } from '../interpreter/Schemas'
import { Convert } from '../lib/Convert'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { Sources } from '../interpreter/Sources'


export class Data {
    static async IsSchemaExist(req: Request): Promise<boolean> {
        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema } = _dataRequest

        Logger.Debug(`Data.IsSchemaExist: ${JSON.stringify(_dataRequest)}`)

        // check if schemas exists in config file
        if (Config.Configuration?.schemas === undefined) {
            Logger.Warn(`section 'schemas' not found in configuration`)
            return false
        }
        // check if schema exists
        if (!_.has(Config.Configuration.schemas, schema)) {
            Logger.Warn(`schema '${schema}' not found in schemas`)
            return false
        }
        return true
    }

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