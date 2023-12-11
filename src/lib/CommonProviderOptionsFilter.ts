//
//
//
//
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'
import { Convert } from './Convert'


export class CommonProviderOptionsFilter {
    static Get(agg: TOptions, schemaRequest: TSchemaRequest): TOptions {
        let _filter = {}
        if (schemaRequest['filter-expression'] || schemaRequest?.filter) {

            if (schemaRequest['filter-expression'])
                _filter = this.GetExpression(schemaRequest['filter-expression'])

            if (schemaRequest?.filter)
                _filter = Convert.JsonToArray(schemaRequest.filter)

            agg.Filter = Convert.ReplacePlaceholders(_filter)
        }
        return agg
    }

    static GetExpression(filterExpression: string): string {
        return Convert.OptionsFilterExpressionToSql(filterExpression)
    }
}