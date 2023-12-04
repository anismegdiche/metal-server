//
//
//
//
//
import { TDataRequest } from '../types/TDataRequest'
import { TOptions } from '../types/TOptions'
import { Convert } from './Convert'


export class CommonProviderOptionsFilter {
    static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
        let _filter = {}
        if (dataRequest['filter-expression'] || dataRequest?.filter) {

            if (dataRequest['filter-expression'])
                _filter = this.GetExpression(dataRequest['filter-expression'])

            if (dataRequest?.filter)
                _filter = Convert.JsonToArray(dataRequest.filter)

            agg.Filter = Convert.ReplacePlaceholders(_filter)
        }
        return agg
    }

    static GetExpression(filterExpression: string): string {
        return Convert.OptionsFilterExpressionToSql(filterExpression)
    }
}