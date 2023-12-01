//
//
//
//
//
import { TDataRequest } from '../types/TDataRequest'
import { TOptions } from '../types/TOptions'


export class CommonProviderOptionsFields {
    static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
        if (dataRequest?.fields === undefined)
            agg.Fields = '*'
        else
            agg.Fields = dataRequest.fields

        return agg
    }
}