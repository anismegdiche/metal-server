//
//
//
//
//

import { RESPONSE_TRANSACTION, RESPONSE, HTTP_STATUS_CODE, RESPONSE_RESULT } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from "../../types/TOptions"
import { TJson } from "../../types/TJson"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseError, TSchemaResponseNoData } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../lib/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { Plan } from '../../server/Plan'
import { CommonSqlDataProviderOptions } from './CommonSqlDataProvider'
import DATA_PROVIDER from '../../server/Source'
import { JsonHelper } from '../../lib/JsonHelper'


export class PlanDataProvider implements IDataProvider.IDataProvider {
    ProviderName = DATA_PROVIDER.PLAN
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    async Init(sourceParams: TSourceParams): Promise<void> {
        Logger.Debug("PlanDataProvider.Init")
        this.Params = sourceParams
    }

    async Connect(): Promise<void> {
        Logger.Info(`${Logger.In} connected to '${this.SourceName} (${this.Params.database})'`)
    }

    async Disconnect(): Promise<void> {
        Logger.Info(`${Logger.In} '${this.SourceName} (${this.Params.database})' disconnected`)
    }

     
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} PlanDataProvider.Insert: ${JsonHelper.Stringify(schemaRequest)}`)
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Insert: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        return <TSchemaResponseError>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PlanDataProvider.Select: ${JsonHelper.Stringify(schemaRequest)}`)

        const options: TOptions = this.Options.Parse(schemaRequest)
        const { schemaName, entityName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.SELECT
        }

        const sqlQueryHelper = new SqlQueryHelper()
            .Select(options.Fields)
            .From(`\`${entityName}\``)
            .Where(options.Filter)
            .OrderBy(options.Sort)

        const sqlQuery = (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined

        const planDataTable = await Plan.Process(schemaRequest, sqlQuery)

        if (planDataTable && planDataTable.Rows.length > 0) {
            if (options?.Cache)
                Cache.Set({
                    ...schemaRequest,
                    sourceName: this.SourceName
                },
                    planDataTable
                )
            return <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: planDataTable
            }
        } else {
            return <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
    }

     
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PlanDataProvider.Update: ${JsonHelper.Stringify(schemaRequest)}`)
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Update: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        return <TSchemaResponseError>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }

     
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`PlanDataProvider.Delete : ${JsonHelper.Stringify(schemaRequest)}`)
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        return <TSchemaResponseError>{
            schemaName,
            entityName,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE_RESULT.ERROR,
            status: HTTP_STATUS_CODE.BAD_REQUEST,
            error: "Not allowed for plans"
        }
    }
}