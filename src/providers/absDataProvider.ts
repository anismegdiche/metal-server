//
//
//
//
//
import typia from "typia"
import { Mixin } from "ts-mixer"
//
import { clsClonable } from "../utils/clsClonable"
import { clsContext } from "../utils/clsContext"
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../types/TSchemaRequest'
import { TInternalResponse } from '../types/TInternalResponse'
import { TSchemaResponse } from "../types/TSchemaResponse"
import { absDataProviderOptions } from "./absDataProviderOptions"
import { TConfigSource } from "../types/TConfig"
import { DATA_PROVIDER } from "../providers/DataProvider"
import { SqlQueryHelper } from "../lib/SqlQueryHelper"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { HttpErrorBadRequest } from "../server/HttpErrors"
import { DataTable } from "../types/DataTable"


//
export class DataProviderOptions extends absDataProviderOptions { }


//
export abstract class absDataProvider extends Mixin(clsClonable, clsContext) {

    abstract ProviderName: DATA_PROVIDER
    abstract SourceName?: string
    abstract Config: unknown
    abstract Connection?: unknown
    Options: absDataProviderOptions = new DataProviderOptions()

    abstract EscapeEntity(entity: string): string
    abstract EscapeField(field: string): string

    // Connection
    abstract Init(source: string, sourceConfig: TConfigSource): Promise<void>
    abstract Connect(): Promise<void>
    abstract Disconnect(): Promise<void>

    // Entities
    abstract ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>>
    abstract AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>>
    //ROADMAP RenameEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>>
    //ROADMAP DeleteEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>>

    // Data
    abstract Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>>
    abstract Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>>
    abstract Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>>
    abstract Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>>

    // eslint-disable-next-line class-methods-use-this
    GetSqlQuery(sqlQueryHelper: SqlQueryHelper, options: TOptionalParameter): string | undefined {
        return (options.Fields != '*' || options.Filter != undefined || options.Sort != undefined)
            ? sqlQueryHelper.Query
            : undefined
    }

    // CURRENT to use in data providers 
    GenerateSqlSelect(entity: string, options: TOptionalParameter): SqlQueryHelper {
        return new SqlQueryHelper()
            .Select(options.Fields)
            .From(this.EscapeEntity(entity))
            .Where(options.Filter)
            .OrderBy(options.Sort)
    }

    // CURRENT to use in data providers 
    GenerateSqlInsert(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryHelper {
        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        return new SqlQueryHelper()
            .Insert(this.EscapeEntity(schemaRequest.entity))
            .Fields(options.Data.GetFieldNames(), '"')
            .Values(options.Data.Rows)
    }

    // CURRENT to use in data providers 
    GenerateSqlUpdate(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryHelper {
        if (!typia.is<DataTable>(options.Data))
            throw new HttpErrorBadRequest(`${schemaRequest.schema}: data is missing`)

        return new SqlQueryHelper()
            .Update(this.EscapeEntity(schemaRequest.entity))
            .Set(options.Data.Rows)
            .Where(options.Filter)
    }

    // CURRENT to use in data providers 
    GenerateSqlDelete(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryHelper {
        return new SqlQueryHelper()
            .Delete()
            .From(this.EscapeEntity(schemaRequest.entity))
            .Where(options.Filter)
    }
}