//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX import { TSchemaRequest } from '../../types/TSchemaRequest'
//XXX import { TOptions } from '../../types/TOptions'
//XXX import * as IData from "../../types/IData"
//XXX import { DataTable } from '../../types/DataTable'
//XXX import { Convert } from '../../lib/Convert'
//XXX import { JsonHelper } from "../../lib/JsonHelper"
//XXX import { Logger } from "../../utils/Logger"


//XXX export class CommonSqlDataOptions implements IData.IDataOptions {

//XXX     @Logger.LogFunction()
//XXX     Parse(schemaRequest: TSchemaRequest): TOptions {
//XXX         let options: TOptions = <TOptions>{}
//XXX         if (schemaRequest) {
//XXX             options = this.GetFilter(options, schemaRequest)
//XXX             options = this.GetFields(options, schemaRequest)
//XXX             options = this.GetSort(options, schemaRequest)
//XXX             options = this.GetData(options, schemaRequest)
//XXX             options = this.GetCache(options, schemaRequest)
//XXX         }
//XXX         return options
//XXX     }

//XXX     @Logger.LogFunction()
//XXX     GetFilter(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
//XXX         let filter = {}
//XXX         if (schemaRequest["filter-expression"] || schemaRequest?.filter) {

//XXX             if (schemaRequest["filter-expression"])
//XXX                 filter = schemaRequest["filter-expression"]

//XXX             if (schemaRequest?.filter)
//XXX                 filter = JsonHelper.ToArray(schemaRequest.filter)

//XXX             options.Filter = Convert.EvaluateJsCode(filter)
//XXX         }
//XXX         return options
//XXX     }

//XXX     @Logger.LogFunction()
//XXX     GetFields(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
//XXX         options.Fields = (schemaRequest?.fields === undefined)
//XXX             ? '*'
//XXX             : schemaRequest.fields

//XXX         return options
//XXX     }

//XXX     @Logger.LogFunction()
//XXX     GetSort(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
//XXX         if (schemaRequest?.sort) {
//XXX             options.Sort = schemaRequest.sort
//XXX         }
//XXX         return options
//XXX     }

//XXX     @Logger.LogFunction()
//XXX     GetData(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
//XXX         if (schemaRequest?.data) {
//XXX             options.Data = new DataTable(
//XXX                 schemaRequest.entity,
//XXX                 Convert.EvaluateJsCode(schemaRequest.data)
//XXX             )
//XXX         }
//XXX         return options
//XXX     }

//XXX     @Logger.LogFunction(Logger.Debug,true)
//XXX     GetCache(options: TOptions, schemaRequest: TSchemaRequest): TOptions {
//XXX         if (schemaRequest?.cache)
//XXX             options.Cache = schemaRequest.cache

//XXX         return options
//XXX     }
//XXX }