// 
// 
// 
// 
// 
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from './TSchemaRequest'
import { TOptions } from './TOptions'
import { TSourceParams } from './TSourceParams'
import { TJson } from './TJson'
import { TSchemaResponse } from './TSchemaResponse'


export interface IDataProviderOptions {
    Parse: (schemaRequest: TSchemaRequest) => TOptions
    GetFilter: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetFields: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetSort: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetData: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetCache: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
}

export interface IDataProvider {
    ProviderName: string
    SourceName: string
    Params: TJson
    Connection?: unknown
    Options: IDataProviderOptions

    // Connection
    Init: (sourceParams: TSourceParams) => void
    Connect: () => Promise<void>
    Disconnect: () => Promise<void>

    // Entities
    ListEntities: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    AddEntity: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    //ROADMAP RenameEntity: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    //ROADMAP DeleteEntity: (schemaRequest: TSchemaRequest) => Promise<TSchemaResponse>
    
    // Data
    Insert: (schemaRequest: TSchemaRequestInsert) => Promise<TSchemaResponse>
    Select: (schemaRequest: TSchemaRequestSelect) => Promise<TSchemaResponse>
    Update: (schemaRequest: TSchemaRequestUpdate) => Promise<TSchemaResponse>
    Delete: (schemaRequest: TSchemaRequestDelete) => Promise<TSchemaResponse>
}