//XXX: classes to remove
//
//
//
//
import { RESPONSE_TRANSACTION, RESPONSE } from '../lib/Const'
import * as IProvider from "../types/IProvider"
import { TSourceParams } from "../types/TSourceParams"
import { TSchemaResponse, TSchemaResponseError } from "../types/TSchemaResponse"
import { TJson } from "../types/TJson"
import { TSchemaRequest } from '../types/TSchemaRequest'
import { Logger } from '../lib/Logger'
import { Convert } from "../lib/Convert"
import { DataTable } from "../types/DataTable"
import { TOptions } from "../types/TOptions"


export class CommonProviderOptions implements IProvider.IProviderOptions {

    Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.GetFilter(options, schemaRequest)
            options = this.GetFields(options, schemaRequest)
            options = this.GetSort(options, schemaRequest)
            options = this.GetData(options, schemaRequest)
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter = {}
        if (schemaRequest?.filterExpression || schemaRequest?.filter) {

            if (schemaRequest?.filterExpression)
                filter = schemaRequest.filterExpression

            if (schemaRequest?.filter)
                filter = Convert.JsonToArray(schemaRequest.filter)

            options.Filter = Convert.ReplacePlaceholders(filter)
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    GetFields(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : schemaRequest.fields

        return options
    }

    // eslint-disable-next-line class-methods-use-this
    GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            options.Sort = schemaRequest.sort
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }
}


export class CommonProvider implements IProvider.IProvider {
    ProviderName = "CommonProvider"
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}

    Options = new CommonProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    Init(sourceParams: TSourceParams): void {
        Logger.Debug("CommonProvider.Init")
        this.Params = sourceParams
    }

    // eslint-disable-next-line class-methods-use-this
    async Connect(): Promise<void> {
        Logger.Debug("CommonProvider.Connect")
    }

    // eslint-disable-next-line class-methods-use-this
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.In} CommonProvider.Disconnect`)
    }

    // eslint-disable-next-line class-methods-use-this
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} CommonProvider.Insert: ${JSON.stringify(schemaRequest)}`)
        return <TSchemaResponseError>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.INSERT,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} CommonProvider.Select: ${JSON.stringify(schemaRequest)}`)
        return <TSchemaResponseError>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.SELECT,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} CommonProvider.Update: ${JSON.stringify(schemaRequest)}`)
        return <TSchemaResponseError>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.UPDATE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        Logger.Debug(`${Logger.Out} CommonProvider.Delete: ${JSON.stringify(schemaRequest)}`)
        return <TSchemaResponseError>{
            schemaName: schemaRequest.schemaName,
            entityName: schemaRequest.entityName,
            ...RESPONSE_TRANSACTION.DELETE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }
    }
}
