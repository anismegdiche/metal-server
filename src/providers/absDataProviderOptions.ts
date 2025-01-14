//
//
//
//
//
import typia from "typia"
//
import { TSchemaRequest } from '../types/TSchemaRequest'
import { TOptions } from '../types/TOptions'
import { DataTable } from '../types/DataTable'
import { JsonHelper } from "../lib/JsonHelper"
import { Logger } from "../utils/Logger"
import { TCacheData } from "../types/TCacheData"
import { TJson } from "../types/TJson"
import { TContext } from "../@types/TContext"
import { PlaceHolder } from "../utils/PlaceHolder"
import { Sandbox } from "../server/Sandbox"


//
export abstract class absDataProviderOptions {
    @Logger.LogFunction()
    Parse(schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        let options: TOptions = <TOptions>{}
        if (schemaRequest) {
            options = this.GetFilter(options, schemaRequest, $context)
            options = this.GetFields(options, schemaRequest, $context)
            options = this.GetSort(options, schemaRequest, $context)
            options = this.GetData(options, schemaRequest, $context)
            options = this.GetCache(options, schemaRequest, $context)
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetFilter(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        let filter = {}
        if (schemaRequest["filter-expression"] || schemaRequest?.filter) {

            if (schemaRequest["filter-expression"])
                filter = schemaRequest["filter-expression"]

            if (schemaRequest?.filter)
                filter = JsonHelper.ToArray(schemaRequest.filter)

            options.Filter = PlaceHolder.EvaluateJsCode<TJson | undefined>(
                filter,
                new Sandbox($context)
            )
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetFields(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        options.Fields = (schemaRequest?.fields === undefined)
            ? '*'
            : PlaceHolder.EvaluateJsCode(
                schemaRequest.fields,
                new Sandbox($context)
            )

        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetSort(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        if (schemaRequest?.sort) {
            options.Sort = PlaceHolder.EvaluateJsCode(
                schemaRequest.sort,
                new Sandbox($context)
            )
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    GetData(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        if (schemaRequest?.data) {
            const _isCacheData = typia.is<TCacheData[]>(schemaRequest.data)
            // no evaluation for CacheData
            const _data = _isCacheData
                ? schemaRequest.data as TJson[]
                : PlaceHolder.EvaluateJsCode<TJson | TJson[]>(schemaRequest.data, new Sandbox($context))

            options.Data = new DataTable(schemaRequest.entity, _data)
        }
        return options
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction(Logger.Debug, true)
    GetCache(options: TOptions, schemaRequest: TSchemaRequest, $context?: Partial<TContext>): TOptions {
        if (schemaRequest?.cache)
            options.Cache = PlaceHolder.EvaluateJsCode(
                schemaRequest.cache,
                new Sandbox($context)
            )

        return options
    }
}