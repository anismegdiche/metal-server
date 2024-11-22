//XXX //XXXXXX: classes to remove
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX import * as IData from "../../types/IData"
//XXX import { TConfigSource } from "../../types/TConfig"
//XXX import { TSchemaResponse } from "../../types/TSchemaResponse"
//XXX import { TJson } from "../../types/TJson"
//XXX import { TSchemaRequest } from '../../types/TSchemaRequest'
//XXX import { Logger } from '../../utils/Logger'
//XXX import { CommonSqlDataOptions } from "./CommonSqlData"
//XXX import { HttpErrorNotImplemented } from "../../server/HttpErrors"
//XXX import { TInternalResponse } from "../../types/TInternalResponse"


//XXX export class CommonData implements IData.IData {
//XXX     ProviderName = "CommonData"
//XXX     SourceName: string
//XXX     Params: TConfigSource = <TConfigSource>{}
//XXX     Config: TJson = {}

//XXX     Options = new CommonSqlDataOptions()

//XXX     constructor(source: string, sourceParams: TConfigSource) {
//XXX         this.SourceName = source
//XXX         this.Params = sourceParams
//XXX         this.Init()
//XXX     }

//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     Init(): void {
//XXX         Logger.Debug("CommonData.Init")
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     async Connect(): Promise<void> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     async Disconnect(): Promise<void> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }


//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }

//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }

//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     //XXX eslint-disable-next-line unused-imports/no-unused-vars
//XXX     async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
//XXX         throw new HttpErrorNotImplemented()
//XXX     }
//XXX }