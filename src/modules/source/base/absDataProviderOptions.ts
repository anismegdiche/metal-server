//
//
//
import { TSchemaRequest } from '../../schema/types/TSchemaRequest'
import { TOptionalParameter } from '../types/TOptionalParameter'
import { DataTable } from '../../../types/DataTable'
import { Logger } from "../../../utils/Logger"
import { TJson } from "../../../types/TJson"
import { TContext } from "../../sandbox/types/TContext"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import { Global } from "../../../modules/core/Global"
import { IDataProviderOptions } from './IDataProviderOptions'


//
export abstract class absDataProviderOptions implements IDataProviderOptions {
    @Logger.LogFunction(true)
    Parse(schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {
        let options: TOptionalParameter = <TOptionalParameter>{}
        if (schemaRequest) {
            if (this.IsFilterNotEmpty(schemaRequest))
                options = this.GetFilter(options, schemaRequest, $context)

            options = this.GetFields(options, schemaRequest, $context)
            options = this.GetSort(options, schemaRequest, $context)
            options = this.GetData(options, schemaRequest, $context)
            options = this.GetCache(options, schemaRequest)
        }
        return options
    }


    @Logger.LogFunction(true)
    GetFilter(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {

        if (schemaRequest["filter-expression"]) {
            options.Filter = PlaceHolder.EvaluateJsCode(
                schemaRequest["filter-expression"],
                new Sandbox($context)
            )
            return options
        }

        if (schemaRequest?.filter) {
            options.Filter = PlaceHolder.EvaluateJsCode(
                schemaRequest.filter,
                new Sandbox($context)
            )
        }
        return options
    }


    @Logger.LogFunction(true)
    GetFields(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {
        const _fields: string = (schemaRequest?.fields === undefined)
            ? '*'
            : PlaceHolder.EvaluateJsCode(
                schemaRequest.fields,
                new Sandbox($context)
            ) ?? '*'

        options.Fields = _fields.split(',').map(f => f.trim())

        return options
    }


    @Logger.LogFunction(true)
    GetSort(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {
        if (schemaRequest?.sort) {
            options.Sort = PlaceHolder.EvaluateJsCode(
                schemaRequest.sort,
                new Sandbox($context)
            )
        }
        return options
    }


    @Logger.LogFunction(true)
    GetData(options: TOptionalParameter, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): Partial<TOptionalParameter> {
        const { schema, entity, data } = schemaRequest

        if (data) {
            const _isCacheData = (schema === Global.Cache.Database && entity === Global.Cache.Entity)
            // no evaluation for CacheData
            const _data = _isCacheData
                ? schemaRequest.data as TJson[]
                : PlaceHolder.EvaluateJsCode<TJson[]>(data, new Sandbox($context))

            options.Data = new DataTable(entity, _data)
        }
        return options
    }


    @Logger.LogFunction(true)
    GetCache(options: TOptionalParameter, schemaRequest: TSchemaRequest): Partial<TOptionalParameter> {
        if (schemaRequest?.cache)
            options.Cache = schemaRequest.cache
        return options
    }


    IsFilterNotEmpty(schemaRequest: TSchemaRequest): boolean {
        return schemaRequest["filter-expression"] !== undefined || Object.keys(schemaRequest?.filter || {}).length > 0
    }
}