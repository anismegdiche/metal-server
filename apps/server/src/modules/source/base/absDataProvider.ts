//
//
//

import { StringUtils } from "@metal/utils"
import { Mixin } from "ts-mixer"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { clsClonable } from "../../../utils/base/clsClonable"
import { clsContext } from "../../../utils/base/clsContext"
import { SqlQueryUtils } from "../../../utils/SqlQueryUtils"
import type { TInternalResponse } from "../../core/types/TInternalResponse"
import type { U__sources_source } from "../../core/types/U__sources"
import { HttpErrorBadRequest } from "../../errors/HttpErrors"
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
import { absDataProviderOptions } from "./absDataProviderOptions"
import type { IDataProvider } from "./IDataProvider"
import type { IDataProviderOptions } from "./IDataProviderOptions"

export class DataProviderOptions extends absDataProviderOptions implements IDataProviderOptions {}

//
export abstract class absDataProvider extends Mixin(clsClonable, clsContext) implements IDataProvider {
	abstract ProviderName: DATA_PROVIDER
	abstract SourceName?: string
	abstract Config: unknown
	abstract Connection?: unknown
	Options: IDataProviderOptions = new DataProviderOptions()

	protected constructor() {
		super()
	}

	// Init
	async Init(source: string, sourceConfig: U__sources_source): Promise<void> {
		Assert.Condition(!StringUtils.IsEmpty(source), `${source}: source name is missing`)
		Assert.Condition(sourceConfig !== undefined, `${source}: source config is missing`)
		this.SourceName = source
	}

	// Connection
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

	// Utils
	abstract EscapeEntity(entity: string): string
	abstract EscapeField(field: string): string

	GetSqlQuery(sqlQueryHelper: SqlQueryUtils, options: TOptionalParameter): string | undefined {
		return options.Fields?.join("") !== "*" ||
			options.Filter !== undefined ||
			options.Sort !== undefined ||
			options.Limit !== undefined
			? sqlQueryHelper.Query()
			: undefined
	}

	GenerateSqlSelect(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils {
		return new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.Select(options.Fields)
			.From((schemaRequest as TSchemaRequestSelect).entity)
			.Where(options.Filter)
			.OrderBy(options.Sort)
			.LimitOffset(options.Limit, options.Offset)
	}

	GenerateSqlCount(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils {
		return new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.SetQuery(`SELECT COUNT(*) AS count FROM ${this.EscapeEntity((schemaRequest as TSchemaRequestSelect).entity)}`)
			.Where(options.Filter)
	}

	async GenerateSqlInsert(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils> {
		Assert.Var<DataTable>(options.Data, `${schemaRequest.schema}: data is missing`, new HttpErrorBadRequest())
		Assert.Condition(
			(await options.Data.Count()) > 0,
			`${schemaRequest.schema}: data is empty`,
			new HttpErrorBadRequest(),
		)

		return new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.Insert((schemaRequest as TSchemaRequestInsert).entity)
			.Fields(options.Data.GetFieldNames())
			.Values(await options.Data.Rows())
	}

	async GenerateSqlUpdate(schemaRequest: TSchemaRequest, options: TOptionalParameter): Promise<SqlQueryUtils> {
		Assert.Var<DataTable>(options.Data, `${schemaRequest.schema}: data is missing`, new HttpErrorBadRequest())
		Assert.Condition(
			(await options.Data.Count()) > 0,
			`${schemaRequest.schema}: data is empty`,
			new HttpErrorBadRequest(),
		)

		return new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.Update((schemaRequest as TSchemaRequestUpdate).entity)
			.Set(await options.Data.Rows())
			.Where(options.Filter)
	}

	GenerateSqlDelete(schemaRequest: TSchemaRequest, options: TOptionalParameter): SqlQueryUtils {
		return new SqlQueryUtils(undefined, this.EscapeEntity, this.EscapeField)
			.Delete()
			.From((schemaRequest as TSchemaRequestDelete).entity)
			.Where(options.Filter)
	}

	async CacheSet(schemaRequest: TSchemaRequestSelect, data: DataTable): Promise<void> {
		const { Cache } = await import("../../cache/Cache")
		await Cache.Set(schemaRequest, data)
	}

	async CacheRemove(schemaRequest: TSchemaRequest): Promise<void> {
		const { Cache } = await import("../../cache/Cache")
		await Cache.Remove(schemaRequest)
	}

	async SetPagination(data: DataTable, options: TOptionalParameter, total: number): Promise<DataTable> {
		if (options.Limit === undefined) return data

		const { DataTableUtils } = await import("../../../utils/DataTableUtils")
		return DataTableUtils.SetPagination(data, { total, limit: options.Limit, offset: options.Offset ?? 0 })
	}
}
