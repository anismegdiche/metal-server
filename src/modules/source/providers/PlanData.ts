//
//
//
import * as _ from 'lodash-es'
//
import { RESPONSE } from '../../core/@consts'
import type { TConfigSource } from "../types/TConfigSource"
import type { TDataListEntity } from "../types/TDataListEntity"
import type { TOptionalParameter } from "../types/TOptionalParameter"
import type { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { Cache } from '../../cache/Cache'
import { Logger } from '../../../utils/Logger'
import { DATA_ENTITY_TYPE, DATA_PROVIDER } from "../@consts"
import { HttpErrorBadRequest, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { HttpResponse } from "../../core/HttpResponse"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import { absDataProvider } from "../base/absDataProvider"
import type { TContext } from "../../sandbox/types/TContext"
import { Plans } from "../../plan/Plans"
import { Source } from "../Source"
import { SynchronizerManager } from "../../../utils/SynchronizerManager"


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
        await super.Init(source, sourceConfig)
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

        if (planData) {
            using _ = planData
            if (await planData.Count() > 0) {
                await data.RowsSet(await planData.Rows())
                if (options?.Cache)
                    Cache.Set({
                        ...schemaRequest,
                        source: this.SourceName
                    },
                        data
                    )
            }
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
    async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Insert: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Update: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }



    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
        const { schema, entity } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schema}', entity '${entity}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        const { schema } = schemaRequest
        Logger.Error(`AddEntity: Not allowed for plans '${schema}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {

        const { schema, source } = schemaRequest

        if (!source || !Source.Sources.has(source))
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const sourceConfig = Source.Sources.get(source)?.SourceConfig
        const planName = sourceConfig?.database

        if (!planName)
            throw new HttpErrorBadRequest(`${schema}: plan '${source}' is missing`)

        const planEntities = Array.from(Plans.Plans.get(planName)?.Entities.keys() || [])

        if (!planEntities || planEntities.length == 0)
            throw new HttpErrorNotFound(`${schema}: No entities found`)

        const data: TDataListEntity[] = planEntities
            .map((key: string) => (<TDataListEntity>{
                name: key,
                type: DATA_ENTITY_TYPE.PLAN_ENTITY
            }))

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data: new DataTable(undefined, data)
        })
    }


    EscapeEntity(entity: string): string {
        return `"${entity}"`
    }


    EscapeField(field: string): string {
        return `"${field}"`
    }
}