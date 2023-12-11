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
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../types/TSchemaResponse"
import { TSchemaRequest } from "../types/TSchemaRequest"
import { TJson } from "../types/TJson"
import { DataTable } from "../types/DataTable"
import { Logger } from "../lib/Logger"
import { Cache } from '../server/Cache'
import { CommonProviderOptionsData } from "../lib/CommonProviderOptionsData"


class MongoDbOptions implements IProvider.IProviderOptions {
    Parse(schemaRequest: TSchemaRequest): TOptions {
        let _agg: TOptions = <TOptions>{}
        if (schemaRequest) {
            _agg = this.Filter.Get(_agg, schemaRequest)
            _agg = this.Fields.Get(_agg, schemaRequest)
            _agg = this.Sort.Get(_agg, schemaRequest)
            _agg = this.Data.Get(_agg, schemaRequest)
        }

        return _agg
    }

    Filter = class {

        static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
            let _filter: any = {}
            if (schemaRequest['filter-expression'] || schemaRequest?.filter) {

                if (schemaRequest['filter-expression'])
                    _filter = this.GetExpression(schemaRequest['filter-expression'])

                if (schemaRequest?.filter)
                    _filter = schemaRequest.filter

                if (_filter?._id)
                    _filter._id = new mongodb.ObjectId(_filter._id)

                agg.Filter = <TJson>{
                    $match: Convert.ReplacePlaceholders(_filter)
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
        static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
            if (schemaRequest?.fields) {
                let _fields: string[] | Record<string, unknown> = []
                if (schemaRequest.fields.includes(",")) {
                    _fields = schemaRequest.fields.split(",")
                        .filter(__field => !(__field == undefined || __field.trim() == ""))
                        .map(__field => __field.trim())
                } else {
                    _fields = [schemaRequest.fields.trim()]
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
        static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
            if (schemaRequest?.sort) {
                const _sort = schemaRequest.sort.trim()
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
        this.Connection = new this.Primitive(host, this.Config)
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

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Insert: ${JSON.stringify(schemaRequest)}`)
        const _options: TOptions = this.Options.Parse(schemaRequest)

        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT
        }

        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(schemaRequest.entity).insertMany(_options?.Data?.Rows)
        Logger.Debug(`${Logger.In} MongoDb.Insert: ${JSON.stringify(schemaRequest)}`)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return _schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MongoDb.Select: ${JSON.stringify(schemaRequest)}`)
        const _agg: mongodb.Document[] = _.values(this.Options.Parse(schemaRequest))
        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }
        await this.Connection.connect()
        const _data = await this.Connection.db(this.Params.database)
            .collection(schemaRequest.entity)
            .aggregate(_agg)
            .toArray()

        if (_data.length > 0) {
            const _dt = new DataTable(schemaRequest.entity, _data)
            Cache.Set(schemaRequest, _dt)
            _schemaResponse = <TSchemaResponseData>{
                ..._schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            _schemaResponse = <TSchemaResponseNoData>{
                ..._schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return _schemaResponse
    }

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Update: ${JSON.stringify(schemaRequest)}`)
        const _options: TOptions = this.Options.Parse(schemaRequest)
        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE
        }
        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(schemaRequest.entity).updateMany(
            (_options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>,
            {
                $set: _.head(_options?.Data?.Rows)
            }
        )
        Logger.Debug(`${Logger.In} MongoDb.Update: ${JSON.stringify(schemaRequest)}`)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return _schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Delete: ${JSON.stringify(schemaRequest)}`)
        const _options: any = this.Options.Parse(schemaRequest)
        let _schemaResponse = <TSchemaResponse>{
            schema: schemaRequest.schema,
            entity: schemaRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE
        }
        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(schemaRequest.entity).deleteMany(
            (_options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>
        )
        Logger.Debug(`${Logger.In} MongoDb.Delete: ${JSON.stringify(schemaRequest)}`)
        _schemaResponse = <TSchemaResponseData>{
            ..._schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
        return _schemaResponse
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