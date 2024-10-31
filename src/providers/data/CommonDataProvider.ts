//XXX: classes to remove
//
//
//
//
import * as IDataProvider from "../../types/IDataProvider"
import { TConfigSource } from "../../types/TConfig"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TJson } from "../../types/TJson"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { CommonSqlDataProviderOptions } from "./CommonSqlDataProvider"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"
import { TInternalResponse } from "../../types/TInternalResponse"


export class CommonDataProvider implements IDataProvider.IDataProvider {
    ProviderName = "CommonDataProvider"
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}

    Options = new CommonSqlDataProviderOptions()

    constructor(source: string, sourceParams: TConfigSource) {
        this.SourceName = source
        this.Init(sourceParams)
        this.Connect()
    }

    @Logger.LogFunction()
    Init(sourceParams: TConfigSource): void {
        Logger.Debug("CommonDataProvider.Init")
        this.Params = sourceParams
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }


    @Logger.LogFunction()
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction()
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }
}