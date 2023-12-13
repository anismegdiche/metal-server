//
//
//
//
//

import { RESPONSE_TRANSACTION, RESPONSE, HTTP_STATUS_CODE, RESPONSE_RESULT } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { TSourceParams } from "../types/TSourceParams"
import { TOptions } from "../types/TOptions"
import { TJson } from "../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError, TSchemaResponseNoData } from '../types/TSchemaResponse'
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'
import { CommonProviderOptionsFilter } from '../lib/CommonProviderOptionsFilter'
import { CommonProviderOptionsFields } from '../lib/CommonProviderOptionsFields'
import { CommonProviderOptionsSort } from '../lib/CommonProviderOptionsSort'
import { SqlQueryHelper } from '../lib/Sql'
import { Server } from '../server/Server'

class PlanOptions implements IProvider.IProviderOptions {

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

    public Filter = CommonProviderOptionsFilter

    public Fields = CommonProviderOptionsFields

    public Sort = CommonProviderOptionsSort

    //TODO: unused
    public Data = CommonProviderOptionsData
}

export class Plan implements IProvider.IProvider {
    public ProviderName = 'Plan'
    public SourceName: string
    public Params: TSourceParams = <TSourceParams>{}
    public Config: TJson = {}

    Options = new PlanOptions()

    constructor(sourceName: string, oParams: TJson) {
        this.SourceName = sourceName
        this.Init(<TSourceParams>oParams)
        this.Connect()
    }

    async Init(oParams: TSourceParams) {
        Logger.Debug("Plan.Init")
        this.Params = oParams
    }

    async Connect(): Promise<void> {
        Logger.Info(`${Logger.In} connected to '${this.SourceName} (${this.Params.database})'`)
    }

    // eslint-disable-next-line class-methods-use-this
    async Disconnect(): Promise<void> {
        return undefined
    }

    // eslint-disable-next-line class-methods-use-this
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} Plan.Insert: ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Insert: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Select: ${JSON.stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schema, entity } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        // eslint-disable-next-line init-declarations
        const sqlQuery = new SqlQueryHelper()
            .Select(options.Fields)
            .From(entity)
            .Where(options.Filter)
            .OrderBy(options.Sort)
            .Query

        const _planSchemaResponse = await Server.Plan.GetData(schemaRequest, sqlQuery)

        if ('data' in _planSchemaResponse && _planSchemaResponse.data.Rows.length > 0) {
            Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            },
                _planSchemaResponse.data
            )
            return <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _planSchemaResponse.data
            };
        } else {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            };
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Update: ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Update: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`Plan.Delete : ${JSON.stringify(schemaRequest)}`)
        const { schema, entity } = schemaRequest
        Logger.Error(`Schema.Delete: Not allowed for plans '${schema}', entity '${entity}'`)
        return <TSchemaResponseError>{
            schema,
            entity,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }
}