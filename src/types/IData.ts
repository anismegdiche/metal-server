//XXX //XXX 
//XXX //XXX 
//XXX //XXX 
//XXX //XXX 
//XXX //XXX 
//XXX import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from './TSchemaRequest'
//XXX import { TOptions } from './TOptions'
//XXX import { TInternalResponse } from './TInternalResponse'
//XXX import { TSchemaResponse } from "./TSchemaResponse"


//XXX export interface IDataOptions {
//XXX     Parse: (schemaRequest: TSchemaRequest) => TOptions
//XXX     GetFilter: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
//XXX     GetFields: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
//XXX     GetSort: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
//XXX     GetData: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
//XXX     GetCache: (options: TOptions, schemaRequest: TSchemaRequest) => TOptions
//XXX }

//XXX export interface IData {
//XXX     ProviderName: string
//XXX     SourceName: string
//XXX     Params: unknown
//XXX     Connection?: unknown
//XXX     Options: IDataOptions

//XXX     //XXX Connection
//XXX     Init: () => void
//XXX     Connect: () => Promise<void>
//XXX     Disconnect: () => Promise<void>

//XXX     //XXX Entities
//XXX     ListEntities: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
//XXX     AddEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<undefined>>
//XXX     //XXXROADMAP RenameEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
//XXX     //XXXROADMAP DeleteEntity: (schemaRequest: TSchemaRequest) => Promise<TInternalResponse<TSchemaResponse>>
    
//XXX     //XXX Data
//XXX     Insert: (schemaRequest: TSchemaRequestInsert) => Promise<TInternalResponse<undefined>>
//XXX     Select: (schemaRequest: TSchemaRequestSelect) => Promise<TInternalResponse<TSchemaResponse>>
//XXX     Update: (schemaRequest: TSchemaRequestUpdate) => Promise<TInternalResponse<undefined>>
//XXX     Delete: (schemaRequest: TSchemaRequestDelete) => Promise<TInternalResponse<undefined>>
//XXX }