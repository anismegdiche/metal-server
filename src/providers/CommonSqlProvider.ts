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


export class CommonSqlProviderOptionsData {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.data) {
            options.Data = new DataTable(
                schemaRequest.entityName,
                Convert.ReplacePlaceholders(schemaRequest.data)
            )
        }
        return options
    }
}
export class CommonSqlProviderOptionsFields {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : schemaRequest.fields

        return options
    }
}

export class CommonSqlProviderOptionsFilter {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter = {}
        if (schemaRequest?.filterExpression || schemaRequest?.filter) {

            if (schemaRequest?.filterExpression)
                filter = CommonSqlProviderOptionsFilter.GetExpression(schemaRequest.filterExpression)

            if (schemaRequest?.filter)
                filter = Convert.JsonToArray(schemaRequest.filter)

            options.Filter = Convert.ReplacePlaceholders(filter)
        }
        return options
    }

    static GetExpression(filterExpression: string): string {
        return Convert.OptionsFilterExpressionToSqlWhere(filterExpression)
    }
}

export class CommonSqlProviderOptionsSort {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        if (schemaRequest?.sort) {
            options.Sort = schemaRequest.sort
        }
        return options
    }
}

export class CommonSqlProviderOptions implements IProvider.IProviderOptions {

    public Parse(schemaRequest: TSchemaRequest): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.Filter.Get(options, schemaRequest)
            options = this.Fields.Get(options, schemaRequest)
            options = this.Sort.Get(options, schemaRequest)
            return this.Data.Get(options, schemaRequest)
        }
        return options
    }

    public Filter = CommonSqlProviderOptionsFilter

    public Fields = CommonSqlProviderOptionsFields

    public Sort = CommonSqlProviderOptionsSort

    public Data = CommonSqlProviderOptionsData
}