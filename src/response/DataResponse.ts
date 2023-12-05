//
//
//
//
//
import { NextFunction, Request, Response } from 'express'

import { Data } from '../server/Data'
import { Convert } from '../lib/Convert'
import { RESPONSE_RESULT, RESPONSE_STATUS, HTTP_STATUS_CODE } from '../lib/Const'
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { ServerResponse } from './ServerResponse'
import _ from 'lodash'

//
const REQUEST_TRANSACTION: Record<string, string> = {
    'GET': 'select',
    'POST': 'insert',
    'PATCH': 'update',
    'DELETE': 'delete'
}

export abstract class DataResponse {
    static CheckSchema(req: Request, res: Response, next: NextFunction) {
        try {
            let _msg = ""
            // check if schemas exists in config file
            if (Config.Configuration?.schemas === undefined) {
                _msg = `section 'schemas' not found in configuration`
                Logger.Warn(_msg)
                return DataResponse.ReplyNotFound(req, res, _msg)
            }
            // check if schema exists
            if (!_.has(Config.Configuration.schemas, req.params.schema)) {
                _msg = `schema '${req.params.schema}' not found in schemas`
                Logger.Warn(_msg)
                return DataResponse.ReplyNotFound(req, res, _msg)
            }
            // // check if source of schema exists
            // if (!_.has(
            //     Config.Configuration?.sources,
            //     Config.Configuration.schemas[req.params.schema]?.source
            // )) {
            //     _msg = `source of schema '${req.params.schema}' not found in sources`
            //     Logger.Warn(_msg)
            //     return DataResponse.ReplyNotFound(req, res, _msg)
            // }
            next()
        } catch (error: any) {
            ServerResponse.Error(res, error)
        }
    }

    static ReplyNotFound(req: Request, res: Response, msg: string): Response {
        Logger.Debug(`${Logger.In} not found in '${req.params.entity}'`)
        return res
            .status(HTTP_STATUS_CODE.NOT_FOUND)
            .json({
                transaction: REQUEST_TRANSACTION[req.method],
                ...RESPONSE_RESULT.NOT_FOUND,
                ...RESPONSE_STATUS.HTTP_404,
                message: msg
            })
    }

    static async Select(req: Request, res: Response) {
        return await Data.Select(req)
            .then(dres => Convert.DataResponseToServerResponse(dres, res))
            .catch((error: any) => ServerResponse.Error(res, error))
    }

    static async Delete(req: Request, res: Response) {
        return await Data.Delete(req)
            .then(dres => Convert.DataResponseToServerResponse(dres, res))
            .catch((error: any) => ServerResponse.Error(res, error))
    }

    static async Update(req: Request, res: Response) {
        return await Data.Update(req)
            .then(dres => Convert.DataResponseToServerResponse(dres, res))
            .catch((error: any) => ServerResponse.Error(res, error))
    }

    static async Insert(req: Request, res: Response) {
        return await Data.Insert(req)
            .then(dres => Convert.DataResponseToServerResponse(dres, res))
            .catch((error: any) => ServerResponse.Error(res, error))
    }
}