//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'
import * as IProvider from "../types/IProvider"
import { DataTable } from '../types/DataTable'
import { Convert } from '../lib/Convert'


export class CommonSqlProviderOptions implements IProvider.IProviderOptions {

    public Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.GetFilter(options, schemaRequest)
            options = this.GetFields(options, schemaRequest)
            options = this.GetSort(options, schemaRequest)
            options = this.GetData(options, schemaRequest)
        }
        return options
    }

    public GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
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

    public GetFields(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : schemaRequest.fields

        return options
    }

    public GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            options.Sort = schemaRequest.sort
        }
        return options
    }

    public GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }
}