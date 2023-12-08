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
import { TDataResponse, TDataResponseData, TDataResponseError, TDataResponseNoData } from '../types/TDataResponse'
import { TDataRequest } from '../types/TDataRequest'
import { Cache } from '../server/Cache'
import { Logger } from '../lib/Logger'
import { CommonProviderOptionsData } from '../lib/CommonProviderOptionsData'
import { CommonProviderOptionsFilter } from '../lib/CommonProviderOptionsFilter'
import { CommonProviderOptionsFields } from '../lib/CommonProviderOptionsFields'
import { CommonProviderOptionsSort } from '../lib/CommonProviderOptionsSort'
import { Plans } from '../interpreter/Plans'
import { SqlQueryHelper } from '../lib/Sql'


class PlanOptions implements IProvider.IProviderOptions {

    Parse(dataRequest: TDataRequest): TOptions {
        let _agg: TOptions = <TOptions>{}
        if (dataRequest) {
            _agg = this.Filter.Get(_agg, dataRequest)
            _agg = this.Fields.Get(_agg, dataRequest)
            _agg = this.Sort.Get(_agg, dataRequest)
            _agg = this.Data.Get(_agg, dataRequest)
        }
        return _agg
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
    async Insert(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`${Logger.Out} Plan.Insert: ${JSON.stringify(dataRequest)}`)
        Logger.Error(`Data.Insert: Not allowed for plans '${dataRequest.schema}', entity '${dataRequest.entity}'`)
        return <TDataResponseError>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    async Select(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Select : ${JSON.stringify(dataRequest)}`)

        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        const _options: TOptions = this.Options.Parse(dataRequest)

        let _dataResponse = <TDataResponse>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.SELECT
        }

        // eslint-disable-next-line init-declarations
        let _sqlQuery: string | undefined

        if (_options.Fields || _options.Filter || _options.Sort) {
            _sqlQuery = new SqlQueryHelper()
                .Select(<string>_options.Fields)
                .From(dataRequest.entity)
                .Where(_options.Filter)
                .OrderBy(<string | undefined>_options.Sort)
                .Query
        }

        const _planDataResponse = await Plans.RenderTable(
            dataRequest.schema,
            this.Params.database as string,
            dataRequest.entity,
            _sqlQuery
        )

        if ((<TDataResponseData>_planDataResponse).data.Rows.length > 0) {
            const _dt = (<TDataResponseData>_planDataResponse).data
            Cache.Set({
                ...dataRequest,
                source: this.SourceName
            }, _dt)
            _dataResponse = <TDataResponseData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            _dataResponse = <TDataResponseNoData>{
                ..._dataResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return _dataResponse
    }

    // eslint-disable-next-line class-methods-use-this
    async Update(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Update: ${JSON.stringify(dataRequest)}`)
        Logger.Error(`Data.Update: Not allowed for plans '${dataRequest.schema}', entity '${dataRequest.entity}'`)
        return <TDataResponseError>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Delete(dataRequest: TDataRequest): Promise<TDataResponse> {
        Logger.Debug(`Plan.Delete : ${JSON.stringify(dataRequest)}`)
        Logger.Error(`Data.Delete: Not allowed for plans '${dataRequest.schema}', entity '${dataRequest.entity}'`)
        return <TDataResponseError>{
            schema: dataRequest.schema,
            entity: dataRequest.entity,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }
}