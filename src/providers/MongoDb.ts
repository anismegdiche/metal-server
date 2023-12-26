//
//
//
//
//
import * as mongodb from 'mongodb'
import _ from 'lodash'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const GetMongoQuery = require("sql2mongo").getMongoQuery
//
import * as IProvider from "../types/IProvider"
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
import { CommonSqlProviderOptionsData } from './CommonSqlProvider'
import { Source } from '../server/Source'


class MongoDbOptions implements IProvider.IProviderOptions {
    Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.Filter.Get(options, schemaRequest)
            options = this.Fields.Get(options, schemaRequest)
            options = this.Sort.Get(options, schemaRequest)
            options = this.Data.Get(options, schemaRequest)
        }

        return options
    }

    Filter = class {

        static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
            let filter: any = {}
            if (schemaRequest?.filterExpression || schemaRequest?.filter) {

                if (schemaRequest?.filterExpression)
                    // deepcode ignore StaticAccessThis: <please specify a reason of ignoring this>
                    filter = this.GetExpression(schemaRequest.filterExpression)

                if (schemaRequest?.filter)
                    filter = schemaRequest.filter

                if (filter?._id)
                    filter._id = new mongodb.ObjectId(filter._id)

                options.Filter = <TJson>{
                    $match: Convert.ReplacePlaceholders(filter)
                }
            }
            return options
        }

        static GetExpression(filterExpression: string) {
            const sqlQueryWhere = Convert.OptionsFilterExpressionToSqlWhere(filterExpression)
            const mongoQueryWhere = GetMongoQuery(sqlQueryWhere.replace(/%/igm, ".*"))
            Logger.Debug(JSON.stringify(mongoQueryWhere))
            return mongoQueryWhere
        }
    }

    Fields = class {
        static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
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
                options.Fields = {
                    $project: _fields
                }
            }
            return options
        }
    }

    Sort = class {
        static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
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
                options.Sort = {
                    $sort: _sortArray
                }
            }
            return options
        }
    }

    public Data = CommonSqlProviderOptionsData
}


export class MongoDb implements IProvider.IProvider {
    public ProviderName = 'mongodb'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Primitive = mongodb.MongoClient
    public Connection: mongodb.MongoClient | undefined = undefined
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


    async Init(oParams: TSourceParams): Promise<void> {
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
        if (this.Connection !== undefined) {
            await this.Connection.close()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Insert: ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        await this.Connection.connect()
        await this.Connection.db(this.Params.database).collection(schemaRequest.entityName).insertMany(options?.Data?.Rows)
        Logger.Debug(`${Logger.In} MongoDb.Insert: ${JSON.stringify(schemaRequest)}`)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MongoDb.Select: ${JSON.stringify(schemaRequest)}`)

        const options: mongodb.Document[] = _.values(this.Options.Parse(schemaRequest))

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        await this.Connection.connect()

        const _data = await this.Connection.db(this.Params.database)
            .collection(schemaRequest.entityName)
            .aggregate(options)
            .toArray()

        if (_data.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, _data)
            Cache.Set(schemaRequest, _dt)
            schemaResponse = <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            schemaResponse = <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return schemaResponse
    }

    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Update: ${JSON.stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        await this.Connection.connect()

        await this.Connection.db(this.Params.database).collection(schemaRequest.entityName).updateMany(
            (options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>,
            {
                $set: _.head(options?.Data?.Rows)
            }
        )
        Logger.Debug(`${Logger.In} MongoDb.Update: ${JSON.stringify(schemaRequest)}`)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDb.Delete: ${JSON.stringify(schemaRequest)}`)

        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const options: any = this.Options.Parse(schemaRequest)

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        await this.Connection.db(this.Params.database).collection(schemaRequest.entityName).deleteMany(
            (options?.Filter?.$match ?? {}) as mongodb.Filter<mongodb.Document>
        )

        Logger.Debug(`${Logger.In} MongoDb.Delete: ${JSON.stringify(schemaRequest)}`)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
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