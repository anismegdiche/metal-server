/* eslint-disable no-unused-vars */
import { MongoClient } from 'mongodb'
import { Pool } from 'pg'

import { TDataRequest } from './TDataRequest'
import { TOptions } from './TOptions'
import { TSourceParams } from './TSourceParams'
import { TJson } from './TJson'
import { TDataResponse } from './TDataResponse'


export interface IProviderOptions {
    Parse: (dataRequest: TDataRequest) => TOptions
    Filter: {
        Get: (agg: TOptions, dataRequest: TDataRequest) => TOptions
        GetExpression: (filterExpression: string) => string
    }
    Fields: {
        Get: (agg: TOptions, dataRequest: TDataRequest) => TOptions
    }
    Sort: {
        Get: (agg: TOptions, dataRequest: TDataRequest) => TOptions
    }
    Data: {
        Get: (agg: TOptions, dataRequest: TDataRequest) => TOptions
    }
}


export interface IProvider {
    ProviderName: string
    SourceName: string
    Params: TJson
    Primitive?: object
    Connection?: TJson | Pool | MongoClient
    Config: TJson
    Init: (oParams: TSourceParams) => void
    Connect: () => Promise<void>
    Disconnect: () => Promise<void>
    Insert: (dataRequest: TDataRequest) => Promise<TDataResponse>
    Select: (dataRequest: TDataRequest) => Promise<TDataResponse>
    Update: (dataRequest: TDataRequest) => Promise<TDataResponse>
    Delete: (dataRequest: TDataRequest) => Promise<TDataResponse>
    Options: IProviderOptions
}