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

    constructor() {
        //
    }

    static Get(__agg: TOptions, dataRequest: TDataRequest): TOptions {
        if (dataRequest?.data) {
            const __dataString = Convert.ReplacePlaceholders(
                JSON.stringify(dataRequest.data)
            )
            __agg.Data = new DataTable(
                dataRequest.entity,
                JSON.parse(__dataString)
            )
        }
        return __agg
    }
}