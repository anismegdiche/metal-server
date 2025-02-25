 
//
//
//
//
//
import _ from 'lodash'
import * as MongoDb from 'mongodb'
import typia from "typia"
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource, TConfigSourceOptions } from "../../types/TConfig"
import { TOptionalParameter } from '../../types/TOptionalParameter'
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from "../../types/TSchemaRequest"
import { DataTable } from "../../types/DataTable"
import { Logger } from "../../utils/Logger"
import { Cache } from '../../server/Cache'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotFound, HttpErrorNotImplemented } from "../../server/HttpErrors"
import { JsonHelper } from "../../lib/JsonHelper"
import { TInternalResponse } from "../../types/TInternalResponse"
import { HttpResponse } from "../../server/HttpResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../@types/TContext"
import { MongoDbHelper } from "./MongoDbHelper"
import { SynchronizerManager } from "../../utils/SynchronizerManager"


//
export type TMongoDbDataConfig = {
    uri: string,
    database?: string,
    options?: TConfigSourceOptions
}


//
export class MongoDbData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.MONGODB
    Config: TMongoDbDataConfig = <TMongoDbDataConfig>{}
    Connection?: MongoDb.MongoClient = undefined

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

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

        const rows = await this.Connection.db(this.Config.database)
            .collection(entity)
            .aggregate(mongoParsedQuery.aggregate)
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

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

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

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        if (!typia.is<DataTable>(options.Data) || options.Data.Rows.length === 0)
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

        const mongoFilter: MongoDb.Filter<MongoDb.Document> = mongoParsedQuery?.aggregate?.at(0)?.$match ?? {}

        const mongoUpdate: MongoDb.BSON.Document[] | MongoDb.UpdateFilter<MongoDb.BSON.Document> = {
            $set: options?.Data?.Rows.at(0)
        }

        await this.Connection
            .db(this.Config.database)
            .collection(schemaRequest.entity)
            .updateMany(mongoFilter, mongoUpdate)

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

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const mongoParsedQuery = MongoDbHelper.ParseSqlQuery(sqlQueryHelper.Query())

        const mongoFilter: MongoDb.Filter<MongoDb.Document> = mongoParsedQuery?.aggregate?.at(0)?.$match ?? {}

        await this.Connection
            .db(this.Config.database)
            .collection(schemaRequest.entity)
            .deleteMany(mongoFilter)

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