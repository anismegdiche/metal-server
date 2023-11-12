//
//
//
//
//
import { Request } from 'express'

import { HTTP_STATUS_CODE, RESPONSE_RESULT, RESPONSE_STATUS, RESPONSE_TRANSACTION } from '../lib/Const'
import { TDataResponse, TDataResponseError, TDataResponseNoData } from '../types/TDataResponse'
import { Plans } from '../interpreter/Plans'
import { Schemas } from '../interpreter/Schemas'
import { Convert } from '../lib/Convert'
import { Logger } from '../lib/Logger'
import { Config } from './Config'
import { Sources } from '../interpreter/Sources'


export class Data {

    static async Select(req: Request): Promise<TDataResponse> {

        const _dataRequest = Convert.RequestToDataRequest(req)
        const { schema, entity } = _dataRequest

        let _dataResponse = <TDataResponse>{
            schema,
            entity
        }

        const _schemaConfig = Config.Configuration.schemas[schema]

        Logger.Debug(`Data.Select: ${JSON.stringify(_dataRequest)}`)

        // case entity,source
        if (_schemaConfig?.entities  ||
            _schemaConfig?.source) {

            _dataRequest.source = Schemas.GetSource(_schemaConfig, _dataRequest)
            Logger.Debug(`Data.Select: using source '${_dataRequest.source}', entity '${entity}'`)
            if (_dataRequest?.source)
                return await Sources.Sources[_dataRequest.source].Select(_dataRequest)
        }

        // case plan
        if (_schemaConfig?.plan  &&
            Config.Configuration?.plans[_schemaConfig.plan]?.[entity]) {

            const
                _planName = _schemaConfig.plan,
                _entityName = entity

            Logger.Debug(`${Logger.Out} using plan '${_planName}'`)
            return await Plans.RenderTable(_planName, _entityName)
        }

        return <TDataResponseNoData>{
            ..._dataResponse,
            ...RESPONSE_RESULT.NOT_FOUND,
            ...RESPONSE_STATUS.HTTP_404
        }
    }

    static async Delete(req: Request): Promise<TDataResponse> {

        const _dataRequest = Convert.RequestToDataRequest(req)
        const _schemaConfig = Config.Configuration.schemas[_dataRequest.schema]
        let _dataResponse = <TDataResponse>{}

        Logger.Debug(`Data.Delete '${JSON.stringify(_dataRequest)}'`)

        // case entity,source
        if (_schemaConfig?.entities  ||
            _schemaConfig?.source) {

            _dataRequest.source = Schemas.GetSource(_schemaConfig, _dataRequest)
            Logger.Debug(`Data.Delete: using source '${_dataRequest.source}', entity '${_dataRequest.entity}'`)
            if (_dataRequest?.source)
                _dataResponse = await Sources.Sources[_dataRequest.source].Delete(_dataRequest)
        }

        // case plan
        if (_schemaConfig?.plan  &&
            Config.Configuration?.plans[_schemaConfig.plan]?.[_dataRequest.entity]) {
            Logger.Error(`Data.Delete: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            _dataResponse = <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.DELETE,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return _dataResponse
    }
    static async Update(req: Request): Promise<TDataResponse> {

        const _dataRequest = Convert.RequestToDataRequest(req)
        const _schemaConfig = Config.Configuration.schemas[_dataRequest.schema]
        let _dataResponse = <TDataResponse>{}

        Logger.Debug(`Data.Update '${JSON.stringify(_dataRequest)}'`)

        // case entity,source
        if (_schemaConfig?.entities  ||
            _schemaConfig?.source) {

            _dataRequest.source = Schemas.GetSource(_schemaConfig, _dataRequest)
            Logger.Debug(`Data.Update: using source '${_dataRequest.source}', entity '${_dataRequest.entity}'`)
            if (_dataRequest?.source)
                _dataResponse = await Sources.Sources[_dataRequest.source].Update(_dataRequest)
        }

        // case plan
        if (_schemaConfig?.plan  &&
            Config.Configuration?.plans[_schemaConfig.plan]?.[_dataRequest.entity]) {
            Logger.Error(`Data.Update: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            _dataResponse = <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.UPDATE,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return _dataResponse
    }

    static async Insert(req: Request): Promise<TDataResponse> {

        const _dataRequest = Convert.RequestToDataRequest(req)
        const _schemaConfig = Config.Configuration.schemas[_dataRequest.schema]
        let _dataResponse = <TDataResponse>{}

        Logger.Debug(`Data.Insert '${JSON.stringify(_dataRequest)}'`)

        // case entity,source
        if (_schemaConfig?.entities  ||
            _schemaConfig?.source) {

            _dataRequest.source = Schemas.GetSource(_schemaConfig, _dataRequest)
            Logger.Debug(`Data.Insert: using source '${_dataRequest.source}', entity '${_dataRequest.entity}'`)
            if (_dataRequest?.source)
                _dataResponse = await Sources.Sources[_dataRequest.source].Insert(_dataRequest)
        }

        // case plan
        if (_schemaConfig?.plan  &&
            Config.Configuration?.plans[_schemaConfig.plan]?.[_dataRequest.entity]) {
            Logger.Error(`Data.Insert: Not allowed for plans '${_dataRequest.schema}', entity '${_dataRequest.entity}'`)
            _dataResponse = <TDataResponseError>{
                schema: _dataRequest.schema,
                entity: _dataRequest.entity,
                ...RESPONSE_TRANSACTION.INSERT,
                ...RESPONSE_RESULT.ERROR,
                status: HTTP_STATUS_CODE.BAD_REQUEST,
                error: "Not allowed for plans"
            }
        }

        return _dataResponse
    }
}