 
//
//
//
//
//
import _ from 'lodash'
import * as MongoDb from 'mongodb'
//
import * as IDataProvider from "../../types/IDataProvider"
import { Convert } from '../../lib/Convert'
import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from '../../types/TOptions'
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from "../../types/TSchemaResponse"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { Logger } from "../../lib/Logger"
import { Cache } from '../../server/Cache'
import DATA_PROVIDER, { Source } from '../../server/Source'
import { MongoDbHelper } from '../../lib/MongoDbHelper'
import { JsonHelper } from '../../lib/JsonHelper'


class MongoDbDataProviderOptions implements IDataProvider.IDataProviderOptions {
    Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.GetFilter(options, schemaRequest)
            options = this.GetFields(options, schemaRequest)
            options = this.GetSort(options, schemaRequest)
            options = this.GetData(options, schemaRequest)
            options = this.GetCache(options, schemaRequest)
        }

        return options
    }

    GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter: any = {}
        if (schemaRequest?.filterExpression || schemaRequest?.filter) {

            if (schemaRequest?.filterExpression) {
                // deepcode ignore StaticAccessThis: <please specify a reason of ignoring this>
                filter = MongoDbHelper.ConvertSqlQuery(schemaRequest.filterExpression.replace(/%/igm, ".*"))
            }
            if (schemaRequest?.filter)
                filter = schemaRequest.filter

            if (filter?._id)
                filter._id = new MongoDb.ObjectId(filter._id)

            options.Filter = <TJson>{
                $match: Convert.ReplacePlaceholders(filter)
            }
        }
        return options
    }

    GetFields(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
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

    GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
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
                _sortArray = _sortArray.reduce(MongoDbHelper.ConvertSqlSort, {})
            }
            Logger.Debug(_sortArray)
            options.Sort = {
                $sort: _sortArray
            }
        }
        return options
    }

    GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }

    GetCache(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.cache)
            options.Cache = schemaRequest.cache

        return options
    }
}


export class MongoDbDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MONGODB
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Connection?: MongoDb.MongoClient = undefined

    Options: MongoDbDataProviderOptions = new MongoDbDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("MongoDbDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        Logger.Debug("MongoDbDataProvider.Connect")
        const {
            host: uri = 'mongodb://localhost:27017/',
            database,
            options = {}
        } = this.Params ?? {}

        this.Connection = new MongoDb.MongoClient(uri, options)
        try {
            await this.Connection.connect()
            await this.Connection
                .db(database)
                .command({
                    ping: 1
                })
            Logger.Info(`${Logger.In} connected to '${this.SourceName} (${database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.In} Failed to connect to '${this.SourceName}/${database}'`)
            Logger.Error(error)
        }
    }

    async Disconnect(): Promise<void> {
        Logger.Debug("MongoDbDataProvider.Disconnect")
        if (this.Connection !== undefined) {
            await this.Connection.close()
        }
    }

    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDbDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)

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
        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .insertMany(options?.Data?.Rows)

        Logger.Debug(`${Logger.In} MongoDbDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.INSERT.SUCCESS.MESSAGE,
            ...RESPONSE.INSERT.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`MongoDbDataProvider.Select: ${JsonHelper.Stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        // eslint-disable-next-line you-dont-need-lodash-underscore/omit
        const aggregation: MongoDb.Document[] = Object.values(_.omit(options, "Cache"))

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        await this.Connection.connect()

        const data = await this.Connection.db(this.Params.database)
            .collection(schemaRequest.entityName)
            .aggregate(aggregation)
            .toArray()

        if (data.length > 0) {
            const _dt = new DataTable(schemaRequest.entityName, data)
            if (options?.Cache)
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
        Logger.Debug(`${Logger.Out} MongoDbDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)

        let schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.UPDATE
        }

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        const options: TOptions = this.Options.Parse(schemaRequest)

        //FIXME: throw error 400
        //if (!options?.Data?.Rows)


        await this.Connection.connect()

        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .updateMany(
                (options?.Filter?.$match ?? {}) as MongoDb.Filter<MongoDb.Document>,
                {
                    //FIXME: replace by upper safer const
                    $set: (options?.Data?.Rows).at(0)
                }
            )

        Logger.Debug(`${Logger.In} MongoDbDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)
        schemaResponse = <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.UPDATE.SUCCESS.MESSAGE,
            ...RESPONSE.UPDATE.SUCCESS.STATUS
        }
        return schemaResponse
    }

    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} MongoDbDataProvider.Delete: ${JsonHelper.Stringify(schemaRequest)}`)

        const schemaResponse = <TSchemaResponse>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE
        }

        const options: any = this.Options.Parse(schemaRequest)

        if (this.Connection === undefined) {
            return Source.ResponseError(schemaResponse)
        }

        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .deleteMany(
                (options?.Filter?.$match ?? {}) as MongoDb.Filter<MongoDb.Document>
            )

        Logger.Debug(`${Logger.In} MongoDbDataProvider.Delete: ${JsonHelper.Stringify(schemaRequest)}`)

        return <TSchemaResponseData>{
            ...schemaResponse,
            ...RESPONSE.DELETE.SUCCESS.MESSAGE,
            ...RESPONSE.DELETE.SUCCESS.STATUS
        }
    }
}