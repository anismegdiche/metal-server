//
//
//
//
//
import * as IProvider from "../types/IProvider"
import * as mongodb from 'mongodb'
import _ from 'lodash'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetMongoQuery = require("sql2mongo").getMongoQuery

import { Convert } from '../lib/Convert'
import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from '../types/TOptions'
import { TDataResponse, TDataResponseData, TDataResponseNoData } from "../types/TDataResponse"
import { TDataRequest } from "../types/TDataRequest"
import { TJson } from "../types/TJson"
import { DataTable } from "../types/DataTable"
import { Logger } from "../lib/Logger"
import { Cache } from '../server/Cache'
import { CommonProviderOptionsData } from "../lib/CommonProviderOptionsData"


class MongoDbOptions implements IProvider.IProviderOptions {
    Parse(dataRequest: TDataRequest): TOptions {
        let _agg: TOptions = <TOptions>{}
        if (dataRequest) {
            _agg = this.Filter.Get(_agg, dataRequest)
            _agg = this.Fields.Get(_agg, dataRequest)
            _agg = this.Sort.Get(_agg, dataRequest)
            _agg = this.Data.Get(_agg, dataRequest)
        }

        return _agg
    }

    Filter = class {

        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            let _filter: any = {}
            if (dataRequest['filter-expression'] || dataRequest?.filter) {

                if (dataRequest['filter-expression'])
                    _filter = this.GetExpression(dataRequest['filter-expression'])

                if (dataRequest?.filter)
                    _filter = dataRequest.filter

                if (_filter?._id)
                    _filter._id = new mongodb.ObjectId(_filter._id)

                agg.Filter = <TJson>{
                    $match: _filter
                }
            }
            return agg
        }

        static GetExpression(filterExpression: string) {
            const _sql = Convert.OptionsFilterExpressionToSql(filterExpression)
            const _mongoQuery = GetMongoQuery(_sql.replace(/%/igm, ".*"))
            Logger.Debug(JSON.stringify(_mongoQuery))
            return _mongoQuery
        }
    }

    Fields = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            if (dataRequest?.fields) {
                let _fields: string[] | Record<string, unknown> = []
                if (dataRequest.fields.includes(",")) {
                    _fields = dataRequest.fields.split(",")
                        .filter(__field => !(__field == undefined || __field.trim() == ""))
                        .map(__field => __field.trim())
                } else {
                    _fields = [dataRequest.fields.trim()]
                }
                if (_fields.length > 0) {
                    _fields = _fields.reduce((__key, __value) => ({
                        ...__key,
                        [__value]: 1
                    }), {})
                }
                agg.Fields = {
                    $project: _fields
                }
            }
            return agg
        }
    }

    Sort = class {
        static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
            if (dataRequest?.sort) {
                const _sort = dataRequest.sort.trim()
                let _sortArray = []
                // test if array
                if (_sort.includes(",")) {
                    _sortArray = _sort
                        .split(",")
                        .filter(__field => !(__field == undefined || __field.trim() == ""))
                        .map(__field => __field.trim().replace(/\W+/igm, " "))
                } else {
                    // single field
                    _sortArray = [_sort.replace(/\W+/igm, " ")]
                }
                Logger.Debug(_sortArray)
                if (_sortArray.length > 0) {
                    _sortArray = _sortArray.reduce(Convert.SqlSortToMongoSort, {})
                }
                Logger.Debug(_sortArray)
                agg.Sort = {
                    $sort: _sortArray
                }
            }
            return agg
        }
    }

    public Data = CommonProviderOptionsData
}


export class MongoDb implements IProvider.IProvider {
    public ProviderName = 'mongodb'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Primitive = mongodb.MongoClient
    public Connection: mongodb.MongoClient = <mongodb.MongoClient>{}
    public Config: TJson = {}

    Options: MongoDbOptions = new MongoDbOptions()

    constructor(sourceName: string, oParams: TSourceParams) {
        this.SourceName = sourceName
        if (oParams.options != null) {
            this.Config = oParams.options
        }
        this.Init(oParams)
        this.Connect()
    }


    async Init(oParams: TSourceParams) {
        Logger.Debug("MongoDb.Init")
        this.Params = oParams
    }

    async Connect(): Promise<void> {
        Logger.Debug("MongoDb.Connect")
        const { host = '' } = this.Params || {}
        this.Connection = new this.Primitive(host as string, this.Config)
        try {
            await this.Connection.connect()
            await this.Connection.db(this.Params.database).command({
                ping: 1
            })
            Logger.Info(`${Logger.In} connected to '${this.SourceName} (${this.Params.database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${this.SourceName}/${this.Params.database}'`)
            Logger.Error(error)
        }
    }

    async Disconnect(): Promise<void> {
        Logger.Debug("MongoDb.Disconnect")
        await this.Connection.close()
    }

    async Insert(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Insert: ${JSON.stringify(dataRequest)}`)
        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(dataRequest.entity).insertMany(_options?.Data?.Rows)
        Logger.Debug(`${Logger.In} MongoDb.Insert: ${JSON.stringify(dataRequest)}`)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return _dataResponse
    }

    async Select(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`MongoDb.Select: ${JSON.stringify(dataRequest)}`)
        const _agg: mongodb.Document[] = _.values(this.Options.Parse(dataRequest))
        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }
        await this.Connection.connect()
        const _data = await this.Connection.db(this.Params.database)
            .collection(dataRequest.entity)
            .aggregate(_agg)
            .toArray()

        if (_data.length > 0) {
            const _dt = new DataTable(dataRequest.entity, _data)
            Cache.Set(dataRequest, _dt)
            _dataResponse = <TDataResponseData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            _dataResponse = <TDataResponseNoData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return _dataResponse
    }

    async Update(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Update: ${JSON.stringify(dataRequest)}`)
        const _options: TOptions = this.Options.Parse(dataRequest)
        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }
        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(dataRequest.entity).updateMany(
            (_options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>,
            {
                $set: _.head(_options?.Data?.Rows)
            }
        )
        Logger.Debug(`${Logger.In} MongoDb.Update: ${JSON.stringify(dataRequest)}`)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return _dataResponse
    }

    async Delete(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Delete: ${JSON.stringify(dataRequest)}`)
        const _options: any = this.Options.Parse(dataRequest)
        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }
        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(dataRequest.entity).deleteMany(
            (_options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>
        )
        Logger.Debug(`${Logger.In} MongoDb.Delete: ${JSON.stringify(dataRequest)}`)
        _dataResponse = <TDataResponseData>{
            ..._dataResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return _dataResponse
    }
}


/***
 * db['!all'].aggregate([
  {$match:
    {'GENDER': 'F',
     'DOB':
      { $gte: 19400801,
        $lte: 20131231 } } },
  {$group:
     {_id: "$GENDER",
     totalscore:{ $sum: "$BRAINSCORE"}}}
])  
 */

/*
[
{ '$match': { '$and': [Array] } },
{ '$project': { name: 1, email: 1 } },
{ '$sort': { name: 1, email: -1 } },
{ '$set': ... }
]
*/