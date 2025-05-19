//
//
//
//
//
import _ from "lodash"
//
import { RESPONSE } from '../../lib/Const'
import { TConfigSource } from "../../types/TConfig"
import { TOptionalParameter } from "../../types/TOptionalParameter"
import { TSchemaResponse } from '../../types/TSchemaResponse'
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { DATA_PROVIDER } from '../../providers/DataProvider'
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { HttpResponse } from "../../server/HttpResponse"
import { TInternalResponse } from "../../types/TInternalResponse"
import { absDataProvider } from "../absDataProvider"
import { TContext } from "../../types/TContext"
import { Plans } from "../../server/Plans"
import { Source } from "../../server/Source"
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
        super.Init(source, sourceConfig)
        this.Config = sourceConfig
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
    @SynchronizerManager.Synchronized()
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

        if (!source || !Source.Sources.has(source))
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const sourceConfig = Source.Sources.get(source)?.SourceConfig
        const planName = sourceConfig?.database

        if (!planName)
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const planData = await Plans.Plans.get(planName)?.ProcessSchemaRequest(schemaRequest, sqlQuery)

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

        const { schema, source } = schemaRequest

        if (!source || !Source.Sources.has(source))
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const sourceConfig = Source.Sources.get(source)?.SourceConfig
        const planName = sourceConfig?.database

        if (!planName)
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const planEntities = Plans.Plans.get(planName)?.Entities.keys().toArray()

        if (!planEntities || planEntities.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        const data = planEntities.map(key => ({
            name: key,
            type: 'plan-entity'
        }))

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: new DataTable(undefined, data)
        })
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return `\`${entity}\``
    }
    
    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return `\`${field}\``
    }
}