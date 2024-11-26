//
//
//
//
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate } from '../types/TSchemaRequest'
import { TInternalResponse } from '../types/TInternalResponse'
import { TSchemaResponse } from "../types/TSchemaResponse"
import { absDataProviderOptions } from "./absDataProviderOptions"
import { TConfigSource } from "../types/TConfig"
import { DATA_PROVIDER } from "../server/Source"


//
export class DataProviderOptions extends absDataProviderOptions { }


//
export abstract class absDataProvider {
    
    abstract ProviderName: DATA_PROVIDER
    SourceName: string
    abstract Params: unknown
    abstract Connection?: unknown
    Options: absDataProviderOptions = new DataProviderOptions()

    constructor(source: string, _sourceParams: TConfigSource) {
        this.SourceName = source
    }

    abstract EscapeEntity(entity: string): string
    abstract EscapeField(field: string): string

    // Connection
    abstract Init(): void
    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>
     
    // Entities
    abstract ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>>
    abstract AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>>
    //ROADMAP RenameEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>>
    //ROADMAP DeleteEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>>
    
    // Data
    abstract Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>>
    abstract Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>>
    abstract Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>>
    abstract Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>>
}