
//
//
//
//
//
import _ from 'lodash'
import * as MongoDb from 'mongodb'
import { SQLParser } from 'sql-in-mongodb'
import typia from "typia"
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource, TConfigSourceOptions } from "../../types/TConfig"
import { TOptions } from '../../types/TOptions'
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../types/TSchemaRequest"
import { TJson } from "../../types/TJson"
import { SORT_ORDER, DataTable } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { Cache } from '../../server/Cache'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"
import { absDataProviderOptions } from "../absDataProviderOptions"
import { TContext } from "../../@types/TContext"
import { PlaceHolder } from "../../utils/PlaceHolder"
import { Sandbox } from "../../server/Sandbox"
import { StringHelper } from '../../lib/StringHelper'


//
export type TMongoDbDataConfig = {
    uri: string,
    database?: string,
    options?: TConfigSourceOptions
}


//
export class MongoDbHelper {

    static readonly WhereParser = new SQLParser()

    @Logger.LogFunction()
    static ConvertSqlSort(key: any, value: string) {
        const aSort = value.split(" ")

        if (aSort.length != 2)
            return {}

        const [field, sqlSortDirection] = aSort

        return {
            ...key,
            [field]: (sqlSortDirection.toLowerCase() == SORT_ORDER.ASC)
                ? 1
                : -1
        }
    }

    @Logger.LogFunction()
    static ConvertSqlQuery(sqlQuery: string | undefined) {
        return (sqlQuery)
            ? this.WhereParser.parseSql(`WHERE ${sqlQuery}`)
            : {}
    }
}

export class MongoDbDataOptions extends absDataProviderOptions {

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetFilter(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {

        if (schemaRequest["filter-expression"]) {
            let evalFilter = PlaceHolder.EvaluateJsCode<string>(
                schemaRequest["filter-expression"],
                new Sandbox($context)
            ) ?? ''

            evalFilter = evalFilter.replace(/%/g, ".*") // Convert SQL-style wildcards to regex

            options.Filter = <TJson>{
                $match: MongoDbHelper.ConvertSqlQuery(evalFilter)
            }
            return options
        }

        if (schemaRequest?.filter) {
            let filter: any = {}
            
            filter = PlaceHolder.EvaluateJsCode<TJson>(schemaRequest.filter, new Sandbox($context))

            for (const key in filter) {
                if (key !== "_id" && typeof filter[key] === "string") {
                    // Convert strings with wildcard patterns into MongoDB regex
                    filter[key] = {
                        $regex: filter[key].replace(/%/g, ".*"),
                        $options: "i"
                    }
                }
            }

            if (filter?._id) {
                filter._id = MongoDb.ObjectId.createFromHexString(filter._id)
            }

            options.Filter = <TJson>{
                $match: filter
            }
        }

        return options
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetFields(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        if (schemaRequest?.fields) {
            const _fields = PlaceHolder.EvaluateJsCode<string>(
                schemaRequest.fields.trim(),
                new Sandbox($context)
            ) ?? ''

            let _aFields: string[] | Record<string, unknown> = []

            if (StringHelper.IsEmpty(_fields)) {
                _aFields = {}
            } else {
                _aFields = _fields.includes(",")
                    ? _fields.split(",")
                        .filter(__field => !(StringHelper.IsEmpty(__field.trim())))
                        .map(__field => __field.trim())
                    : [_fields.trim()]

                if (_aFields.length > 0) {
                    _aFields = _aFields.reduce((__key, __value) => ({
                        ...__key,
                        [__value]: 1
                    }), {})
                }
            }
            options.Fields = {
                $project: _aFields
            }
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetSort(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        if (schemaRequest?.sort) {
            const _sort = PlaceHolder.EvaluateJsCode<string>(
                schemaRequest.sort.trim(),
                new Sandbox($context)
            ) ?? ''

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
}


export class MongoDbData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.MONGODB
    Config: TMongoDbDataConfig = <TMongoDbDataConfig>{}
    Connection?: MongoDb.MongoClient = undefined

    //TODO change MongoDbDataOptions to static
    Options: MongoDbDataOptions = new MongoDbDataOptions()

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug("MongoDbData.Init")
        this.SourceName = source
        this.Config = {
            uri: sourceConfig.host ?? 'mongodb://localhost:27017/',
            database: sourceConfig.database,
            options: sourceConfig.options
        }
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return entity
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return field
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        this.Connection = new MongoDb.MongoClient(this.Config.uri, this.Config.options)
        try {
            await this.Connection.connect()
            await this.Connection
                .db(this.Config.database)
                .command({
                    ping: 1
                })
            Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
        } catch (error: unknown) {
            Logger.Error(`${Logger.Out} Failed to connect to '${this.SourceName}/${this.Config.database}'`)
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
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {
        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema, entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        //CURRENT E2E testing
        // eslint-disable-next-line you-dont-need-lodash-underscore/omit, you-dont-need-lodash-underscore/values
        const aggregation: MongoDb.Document[] = _.values(_.omit(options, "Cache")) as MongoDb.Document[]

        await this.Connection.connect()

        const rows = await this.Connection.db(this.Config.database)
            .collection(entity)
            .aggregate(aggregation)
            .toArray()

        const data = new DataTable(entity)

        if (rows.length > 0) {
            data.AddRows(rows)
            if (options?.Cache)
                Cache.Set(schemaRequest, data)
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }


    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        await this.Connection.connect()
        await this.Connection
            .db(this.Config.database)
            .collection(schemaRequest.entity)
            .insertMany(options?.Data?.Rows)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.Created()
    }

    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data) || options.Data.Rows.length === 0)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        await this.Connection.connect()

        const _mongoFilter: MongoDb.Filter<MongoDb.Document> = ((options?.Filter as TJson)?.$match) ?? {}
        const _mongoUpdate: MongoDb.BSON.Document[] | MongoDb.UpdateFilter<MongoDb.BSON.Document> = {
            $set: options?.Data?.Rows.at(0)
        }

        await this.Connection
            .db(this.Config.database)
            .collection(schemaRequest.entity)
            .updateMany(_mongoFilter, _mongoUpdate)

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptions = this.Options.Parse(schemaRequest, $context)

        await this.Connection
            .db(this.Config.database)
            .collection(schemaRequest.entity)
            .deleteMany(
                ((options?.Filter as TJson)?.$match) as MongoDb.Filter<MongoDb.Document>
            )

        // clean cache
        Cache.Remove(schemaRequest)

        return HttpResponse.NoContent()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        if (this.Connection === undefined)
            throw new HttpErrorInternalServerError(JsonHelper.Stringify(schemaRequest))

        const { schema } = schemaRequest

        await this.Connection.connect()

        const collections = await this.Connection.db(this.Config.database).listCollections().toArray()

        if (collections.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        const rows = await Promise.all(
            collections.map(async (item) => {
                let size = -1
                if (this.Connection !== undefined) {
                    const collection = this.Connection.db(this.Config.database).collection(item.name)
                    size = await collection.countDocuments()
                }
                // eslint-disable-next-line you-dont-need-lodash-underscore/assign
                return _.assign(_.pick(item, ['name', 'type']), { size })
            })
        )

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, rows)
        })
    }
}