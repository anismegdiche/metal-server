/* eslint-disable no-unused-vars */
import { MongoClient } from 'mongodb'
import { Pool } from 'pg'

import { TSchemaRequest } from './TSchemaRequest'
import { TOptions } from './TOptions'
import { TSourceParams } from './TSourceParams'
import { TJson } from './TJson'
import { TSchemaResponse } from './TSchemaResponse'
import { ConnectionPool } from 'mssql'


export interface IProviderOptions {
    Parse: (schemaRequest: TSchemaRequest) => TOptions
    GetFilter: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetFields: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetSort: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetData: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
}


export interface IProvider {
    ProviderName: string
    SourceName: string
    Params: TJson
    Primitive?: object
    Connection?: Pool | MongoClient | ConnectionPool
    Config: TJson
    Init: (oParams: TSourceParams) => void
    Connect: () => Promise<void>
    Disconnect: () => Promise<void>
    Insert: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    Select: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    Update: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    Delete: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    Options: IProviderOptions
}