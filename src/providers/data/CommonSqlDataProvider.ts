//
//
//
//
//
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { TOptions } from '../../types/TOptions'
import * as IDataProvider from "../../types/IDataProvider"
import { DataTable } from '../../types/DataTable'
import { Convert } from '../../lib/Convert'
import { JsonHelper } from "../../lib/JsonHelper"
import { Logger } from "../../utils/Logger"


export class CommonSqlDataProviderOptions implements IDataProvider.IDataProviderOptions {

    @Logger.LogFunction()
    Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.GetFilter(options, schemaRequest)
            options = this.GetFields(options, schemaRequest)
            options = this.GetSort(options, schemaRequest)
            options = this.GetData(options, schemaRequest)
            options = this.GetCache(options, schemaRequest)
        }
        return options
    }

    @Logger.LogFunction()
    GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter = {}
        if (schemaRequest?.filterExpression || schemaRequest?.filter) {

            if (schemaRequest?.filterExpression)
                filter = schemaRequest.filterExpression

            if (schemaRequest?.filter)
                filter = JsonHelper.ToArray(schemaRequest.filter)

            options.Filter = Convert.ReplacePlaceholders(filter)
        }
        return options
    }

    @Logger.LogFunction()
    GetFields(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : schemaRequest.fields

        return options
    }

    @Logger.LogFunction()
    GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            options.Sort = schemaRequest.sort
        }
        return options
    }

    @Logger.LogFunction()
    GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }

    @Logger.LogFunction(Logger.Debug,true)
    GetCache(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.cache)
            options.Cache = schemaRequest.cache

        return options
    }
}