// 
// 
// 
// 
// 
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from './TSchemaRequest'
import { TOptions } from './TOptions'
import { TConfigSource } from './TConfig'
import { TJson } from './TJson'
import { TInternalResponse } from './TInternalResponse'
import { TSchemaResponse } from "./TSchemaResponse"


export interface IDataOptions {
    Parse: (schemaRequest: TSchemaRequest) => TOptions
    GetFilter: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetFields: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetSort: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetData: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
    GetCache: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
}

export interface IData {
    ProviderName: string
    SourceName: string
    Params: unknown
    Connection?: unknown
    Options: IDataOptions

    // Connection
    Init: () => void
    Connect: () => Promise<void>
    Disconnect: () => Promise<void>

    // Entities
    ListEntities: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
    AddEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<undefined>>
    //ROADMAP RenameEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
    //ROADMAP DeleteEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
    
    // Data
    Insert: (schemaRequest: TSchemaRequestInsert) => Promise<TInternalResponse<undefined>>
    Select: (schemaRequest: TSchemaRequestSelect) => Promise<TInternalResponse<TSchemaResponse>>
    Update: (schemaRequest: TSchemaRequestUpdate) => Promise<TInternalResponse<undefined>>
    Delete: (schemaRequest: TSchemaRequestDelete) => Promise<TInternalResponse<undefined>>
}