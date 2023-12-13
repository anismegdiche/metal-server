//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'
import { Convert } from './Convert'


export class CommonProviderOptionsFilter {
    static Get(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let filter = {}
        if (schemaRequest['filter-expression'] || schemaRequest?.filter) {

            if (schemaRequest['filter-expression'])
                filter = this.GetExpression(schemaRequest['filter-expression'])

            if (schemaRequest?.filter)
                filter = Convert.JsonToArray(schemaRequest.filter)

            options.Filter = Convert.ReplacePlaceholders(filter)
        }
        return options
    }

    static GetExpression(filterExpression: string): string {
        return Convert.OptionsFilterExpressionToSql(filterExpression)
    }
}