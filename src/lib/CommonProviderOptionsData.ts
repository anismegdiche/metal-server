//
//
//
//
//
import { TDataRequest } from '../types/TDataRequest'
import { DataTable } from '../types/DataTable'
import { TOptions } from '../types/TOptions'
import { Convert } from './Convert'


export class CommonProviderOptionsData {
    static Get(__agg: TOptions, dataRequest: TDataRequest): TOptions {
        if (dataRequest?.data) {
            __agg.Data = new DataTable(
                dataRequest.entity,
                Convert.ReplacePlaceholders(dataRequest.data)
            )
        }
        return __agg
    }
}