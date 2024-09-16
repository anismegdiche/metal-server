//XXX: classes to remove
//
//
//
//
import * as IDataProvider from "../../types/IDataProvider"
import { TSourceParams } from "../../types/TSourceParams"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TJson } from "../../types/TJson"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpNotImplementedError } from "../../server/HttpErrors"


export class CommonDataProvider implements IDataProvider.IDataProvider {
    ProviderName = "CommonDataProvider"
    SourceName: string
    Params: TSourceParams = <TSourceParams>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(sourceName: string, sourceParams: TSourceParams) {
        this.SourceName = sourceName
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    Init(sourceParams: TSourceParams): void {
        Logger.Debug("CommonDataProvider.Init")
        this.Params = sourceParams
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        throw new HttpNotImplementedError()
    }


    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        throw new HttpNotImplementedError()
    }


    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpNotImplementedError()
    }


    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpNotImplementedError()
    }


    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpNotImplementedError()
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpNotImplementedError()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TSchemaResponse> {
        throw new HttpNotImplementedError()
    }
}