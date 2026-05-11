//
//
//

import { Global } from "../../../modules/core/Global"
import { DataTable, type TOrderBy } from "../../../types/DataTable"
import type { TJson } from "../../../types/TJson"
import { Logger } from "../../../utils/Logger"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import type { TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect } from "../../schema/types/TSchemaRequest"
import type { TOptionalParameter } from "../@types"
import type { IDataProviderOptions } from "./IDataProviderOptions"

//
export abstract class absDataProviderOptions implements IDataProviderOptions {
	// NOSONAR
	@Logger.LogFunction(true)
	Parse(schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {
		let options: TOptionalParameter = <TOptionalParameter>{}
		if (schemaRequest) {
			if (this.IsFilterNotEmpty(schemaRequest)) options = this.GetFilter(options, schemaRequest, $context)

			options = this.GetFields(options, schemaRequest, $context)
			options = this.GetSort(options, schemaRequest, $context)
			options = this.GetData(options, schemaRequest, $context)
			options = this.GetCache(options, schemaRequest)
		}
		return options
	}

	@Logger.LogFunction(true)
	GetFilter(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>,): Partial<TOptionalParameter> {
		const {
			"filter-expression": filterExpression,
			filter
		} = schemaRequest as TSchemaRequestSelect

		if (filterExpression) {
			options.Filter = PlaceHolder.EvaluateJsCode<string>(filterExpression, new Sandbox($context)) as string
			return options
		}

		if (filter) {
			options.Filter = PlaceHolder.EvaluateJsCode<TJson>(filter, new Sandbox($context)) as TJson
		}
		return options
	}

	@Logger.LogFunction(true)
	GetFields(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>,): Partial<TOptionalParameter> {
		const { fields } = schemaRequest as TSchemaRequestSelect
		const _fields: string =
			fields === undefined ? "*" : (PlaceHolder.EvaluateJsCode(fields, new Sandbox($context)) ?? "*")

		options.Fields = _fields.split(",").map((f) => f.trim())

		return options
	}

	@Logger.LogFunction(true)
	GetSort(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>,): Partial<TOptionalParameter> {
		const { sort } = schemaRequest as TSchemaRequestSelect
		if (sort) {
			options.Sort = PlaceHolder.EvaluateJsCode<TOrderBy>(sort, new Sandbox($context)) as TOrderBy
		}
		return options
	}

	@Logger.LogFunction(true)
	GetData(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>,): Partial<TOptionalParameter> {
		const { schema, entity, data } = schemaRequest as TSchemaRequestInsert

		if (data) {
			const _isCacheData = schema === Global.Cache.Database && entity === Global.Cache.Entity
			// no evaluation for CacheData
			const _data = _isCacheData
				? (data as TJson[])
				: PlaceHolder.EvaluateJsCode<TJson[]>(data, new Sandbox($context)) ?? undefined

			options.Data = new DataTable(entity, _data)
		}
		return options
	}

	@Logger.LogFunction(true)
	GetCache(options: TOptionalParameter, schemaRequest: TSchemaRequest): Partial<TOptionalParameter> {
		const { cache } = schemaRequest as TSchemaRequestSelect
		if (cache) options.Cache = cache
		return options
	}

	IsFilterNotEmpty(schemaRequest: TSchemaRequest): boolean {
		const { "filter-expression": filterExpression, filter } = schemaRequest as TSchemaRequestSelect
		return filterExpression !== undefined || Object.keys(filter || {}).length > 0
	}
}
