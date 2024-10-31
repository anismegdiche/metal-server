//
//
//
//
//
import { RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TConfigSource } from "../../types/TConfig"
import { TOptions } from "../../types/TOptions"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { Plan } from '../../server/Plan'
import DATA_PROVIDER from '../../server/Source'
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../server/HttpErrors"
import { Config } from "../../server/Config"
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpResponse } from "../../server/HttpResponse"
import { TInternalResponse } from "../../types/TInternalResponse"


export class PlanDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.PLAN
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TConfigSource) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    async Init(sourceParams: TConfigSource): Promise<void> {
        Logger.Debug("PlanDataProvider.Init")
        this.Params = sourceParams
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Params.database})'`)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Params.database})' disconnected`)
    }


    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const { schema, entityName } = schemaRequest
        Logger.Error(`Insert: Not allowed for plans '${schema}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entityName
        }

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const planData = await Plan.Process(schemaRequest, sqlQuery)

        const data = new DataTable(schemaRequest.entityName)

        if (planData && planData.Rows.length > 0) {
            data.AddRows(planData.Rows)
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    sourceName: this.SourceName
                },
                    data
                )
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
        const { schema, entityName } = schemaRequest
        Logger.Error(`Update: Not allowed for plans '${schema}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const { schema, entityName } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schema}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const { schema, entityName } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schema}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema } = schemaRequest

        const data = Object.keys(Config.Get('plans')).map(key => ({
            name: key,
            type: 'plan'
        }))

        if (data.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, data)
        })
    }
}