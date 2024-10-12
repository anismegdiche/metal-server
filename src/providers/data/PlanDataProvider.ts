//
//
//
//
//
import { RESPONSE_TRANSACTION, RESPONSE } from '../../lib/Const'
import * as IDataProvider from "../../types/IDataProvider"
import { TSourceParams } from "../../types/TSourceParams"
import { TOptions } from "../../types/TOptions"
import { TSchemaResponse, TSchemaResponseData, TSchemaResponseNoData } from '../../types/TSchemaResponse'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Cache } from '../../server/Cache'
import { Logger } from '../../utils/Logger'
import { SqlQueryHelper } from '../../lib/SqlQueryHelper'
import { Plan } from '../../server/Plan'
import DATA_PROVIDER from '../../server/Source'
import { HttpErrorBadRequest } from "../../server/HttpErrors"
import { Config } from "../../server/Config"
import { DataTable } from "../../types/DataTable"
import { TJson } from "../../types/TJson"
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"


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

    @Logger.LogFunction()
    async Init(sourceParams: TSourceParams): Promise<void> {
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
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Insert: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

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


    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Update: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        const { schemaName, entityName } = schemaRequest
        Logger.Error(`Delete: Not allowed for plans '${schemaName}', entity '${entityName}'`)
        throw new HttpErrorBadRequest("Not allowed for plans")
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {

        const { schemaName } = schemaRequest
        const entityName = `${schemaRequest.schemaName}-entities`

        let schemaResponse = <TSchemaResponse>{
            schemaName,
            ...RESPONSE_TRANSACTION.LIST_ENTITIES
        }

        const data = Object.keys(Config.Get('plans')).map(key => ({
            name: key,
            type: 'plan'
        }))

        if (data.length > 0) {
            const _dt = new DataTable(entityName, data)
            schemaResponse = <TSchemaResponseData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.SUCCESS.MESSAGE,
                ...RESPONSE.SELECT.SUCCESS.STATUS,
                data: _dt
            }
        } else {
            schemaResponse = <TSchemaResponseNoData>{
                ...schemaResponse,
                ...RESPONSE.SELECT.NOT_FOUND.MESSAGE,
                ...RESPONSE.SELECT.NOT_FOUND.STATUS
            }
        }
        return schemaResponse
    }
}