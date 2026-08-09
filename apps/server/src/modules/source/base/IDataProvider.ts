//
//
//
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { clsContext } from "../../../utils/base/clsContext"
import type { SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import type {
	TSchemaRequest,
	TSchemaRequestDelete,
	TSchemaRequestInsert,
	TSchemaRequestListEntities,
	TSchemaRequestSelect,
	TSchemaRequestUpdate,
} from "../../schema/types/TSchemaRequest"
import type { TSchemaResponse } from "../../schema/types/TSchemaResponse"
import type { DATA_PROVIDER } from "../@consts"
import type { TOptionalParameter } from "../@types"
import type { IDataProviderOptions } from "./IDataProviderOptions"

//
export interface IDataProvider extends clsClonable, clsContext {
	ProviderName: DATA_PROVIDER
	SourceName?: string
	Config: unknown
	Connection?: unknown
	Options: IDataProviderOptions

	// Init
	Init(source: string, sourceConfig: U__sources_source): Promise<void>

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
	GenerateSqlCount(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils
	GenerateSqlInsert(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils>
	GenerateSqlUpdate(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils>
	GenerateSqlDelete(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils
}
