//
//
//
//
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource } from "../../types/TConfig"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { Plan } from '../../server/Plan'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../server/HttpErrors"
import { Config } from "../../server/Config"
import { DataTable } from "../../types/DataTable"
import { HttpResponse } from "../../server/HttpResponse"
import { TInternalResponse } from "../../types/TInternalResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../@types/TContext"
import { SynchronizerManager } from "../../utils/SynchronizerManager"


export class PlanData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.PLAN
    Config: TConfigSource = <TConfigSource>{}
    Connection: undefined

    constructor() {
        super()
    }


    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug("PlanData.Init")
        this.SourceName = source
        this.Config = sourceConfig
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `\`${field}\``
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Info(`${Logger.Out} connected to '${this.SourceName} (${this.Config.database})'`)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Config.database})' disconnected`)
    }

    @Logger.LogFunction()
    @SynchronizerManager.Synchronized(["schemaRequest"])
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema, entity, source } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const planData = await Plan.ProcessSchemaRequest(schemaRequest, sqlQuery)

        const data = new DataTable(schemaRequest.entity)

        if (planData && planData.Rows.length > 0) {
            data.AddRows(planData.Rows)
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    source: this.SourceName
                },
                    data
                )
        }

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Insert: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Update: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`AddEntity: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

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