
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
import { RESPONSE } from '../../lib/Const'
import { TConfigSource } from "../../types/TConfig"
import { TOptions } from '../../types/TOptions'
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TSchemaRequest } from "../../types/TSchemaRequest"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { Cache } from '../../server/Cache'
import DATA_PROVIDER from '../../server/Source'
import { MongoDbHelper } from '../../lib/MongoDbHelper'
import { HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"


class MongoDbDataProviderOptions implements IDataProvider.IDataProviderOptions {
    @Logger.LogFunction()
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

    @Logger.LogFunction()
    GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter: any = {}
        if (schemaRequest?.filterExpression || schemaRequest?.filter) {

            if (schemaRequest?.filterExpression)
                // deepcode ignore StaticAccessThis: <please specify a reason of ignoring this>
                filter = MongoDbHelper.ConvertSqlQuery(schemaRequest.filterExpression.replace(/%/igm, ".*"))
            
            if (schemaRequest?.filter)
                filter = schemaRequest.filter

            if (filter?._id)
                filter._id = new MongoDb.ObjectId(filter._id)

            options.Filter = <TJson>{
                $match: Convert.EvaluateJsCode(filter)
            }
        }
        return options
    }

    @Logger.LogFunction()
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

    @Logger.LogFunction()
    GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            const _sort = schemaRequest.sort.trim()

            // test if array
            let _sortArray = _sort.includes(",")
                ? _sort
                    .split(",")
                    .filter(__field => !(__field == undefined || __field.trim() == ""))
                    .map(__field => __field.trim().replace(/\W+/igm, " "))
                : [_sort.replace(/\W+/igm, " ")]

            Logger.Debug(_sortArray)
            if (_sortArray.length > 0)
                _sortArray = _sortArray.reduce(MongoDbHelper.ConvertSqlSort, {})
            
            Logger.Debug(_sortArray)
            options.Sort = {
                $sort: _sortArray
            }
        }
        return options
    }

    @Logger.LogFunction()
    GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.EvaluateJsCode(schemaRequest.data)
            )
        }
        return options
    }

    @Logger.LogFunction(Logger.Debug, true)
    GetCache(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.cache)
            options.Cache = schemaRequest.cache

        return options
    }
}


export class MongoDbDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.MONGODB
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Connection?: MongoDb.MongoClient = undefined

    //TODO: change MongoDbDataProviderOptions to static
    Options: MongoDbDataProviderOptions = new MongoDbDataProviderOptions()

    constructor(sourceName: string, sourceParams: TConfigSource) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
        this.Params = sourceParams
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
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
            Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName}/${database}'`)
            Logger.Error(error)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection !== undefined) {
            await this.Connection.close()
        }
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {


        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        await this.Connection.connect()
        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .insertMany(options?.Data?.Rows)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schemaName, entityName } = schemaRequest

        let schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName
        }

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)
        // eslint-disable-next-line you-dont-need-lodash-underscore/omit, you-dont-need-lodash-underscore/values
        const aggregation: MongoDb.Document[] = _.values(_.omit(options, "Cache"))

        await this.Connection.connect()

        const rows = await this.Connection.db(this.Params.database)
            .collection(schemaRequest.entityName)
            .aggregate(aggregation)
            .toArray()

        const data = new DataTable(entityName)

        if (rows.length > 0) {
            data.AddRows(rows)
            if (options?.Cache)
                Cache.Set(schemaRequest, data)
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            ...schemaResponse,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {


        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const options: TOptions = this.Options.Parse(schemaRequest)

        await this.Connection.connect()

        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .updateMany(
                (options?.Filter?.$match ?? {}) as MongoDb.Filter<MongoDb.Document>,
                {
                    $set: options?.Data?.Rows.at(0)
                }
            )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {


        const options: any = this.Options.Parse(schemaRequest)

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        await this.Connection
            .db(this.Params.database)
            .collection(schemaRequest.entityName)
            .deleteMany(
                (options?.Filter?.$match ?? {}) as MongoDb.Filter<MongoDb.Document>
            )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schemaName } = schemaRequest

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        await this.Connection.connect()

        const collections = await this.Connection.db(this.Params.database).listCollections().toArray()

        if (collections.length == 0)
            throw new HttpErrorNotFound(`${schemaName}: No entities found`)

        const rows = await Promise.all(
            collections.map(async (item) => {
                let size = -1
                if (this.Connection !== undefined) {
                    const collection = this.Connection.db(this.Params.database).collection(item.name)
                    size = await collection.countDocuments()
                }
                // eslint-disable-next-line you-dont-need-lodash-underscore/assign
                return _.assign(_.pick(item, ['name', 'type']), { size })
            })
        )

        return HttpResponse.Ok(<TSchemaResponse>{
            schemaName,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, rows)
        })
    }
}