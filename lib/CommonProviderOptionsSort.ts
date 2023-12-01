//
//
//
//
//
import { TDataRequest } from '../types/TDataRequest'
import { TOptions } from '../types/TOptions'


export class CommonProviderOptionsSort {
    static Get(agg: TOptions, dataRequest: TDataRequest): TOptions {
        if (dataRequest?.sort) {
            agg.Sort = dataRequest.sort
        }
        return agg
    }
}