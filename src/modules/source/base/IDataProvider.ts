//
//
//
//
import { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import { TInternalResponse } from '../../schema/types/TInternalResponse'
import { IDataProviderOptions } from "./IDataProviderOptions"
import { SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import { TOptionalParameter } from "../types/TOptionalParameter"
import { DATA_PROVIDER } from "../@consts"
import { TConfigSource } from "../types/TConfigSource"
import { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import { clsClonable } from "../../../utils/base/clsClonable"
import { clsContext } from "../../../utils/base/clsContext"


//
export interface IDataProvider extends clsClonable, clsContext {

    ProviderName: DATA_PROVIDER
    SourceName?: string
    Config: unknown
    Connection?: unknown
    Options: IDataProviderOptions

    // Init
    Init(source: string, sourceConfig: TConfigSource): Promise<void>

    // Connection
    Connect(): Promise<void>
    Disconnect(): Promise<void>

    // Entities
    ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>>
    AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>>

    // Data
    Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>>
    Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>>
    Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>>
    Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>>


    // Utils
    EscapeEntity(entity: string): string
    EscapeField(field: string): string

     
    GetSqlQuery(sqlQueryHelper: SqlQueryUtils, options: TOptionalParameter): string | undefined
    GenerateSqlSelect(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils
    GenerateSqlInsert(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils>
    GenerateSqlUpdate(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils>
    GenerateSqlDelete(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils
}
