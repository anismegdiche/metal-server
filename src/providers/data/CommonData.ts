//XXX: classes to remove
//
//
//
//
import * as IData from "../../types/IData"
import { TConfigSource } from "../../types/TConfig"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { TJson } from "../../types/TJson"
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { Logger } from '../../utils/Logger'
import { CommonSqlDataOptions } from "./CommonSqlData"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"
import { TInternalResponse } from "../../types/TInternalResponse"


export class CommonData implements IData.IData {
    ProviderName = "CommonData"
    SourceName: string
    Params: TConfigSource = <TConfigSource>{}
    Config: TJson = {}

    Options = new CommonSqlDataOptions()

    constructor(source: string, sourceParams: TConfigSource) {
        this.SourceName = source
        this.Params = sourceParams
        this.Init()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    Init(): void {
        Logger.Debug("CommonData.Init")
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async Insert(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async Select(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async Update(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }


    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async Delete(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    // eslint-disable-next-line unused-imports/no-unused-vars
    async ListEntities(schemaRequest: TSchemaRequest): Promise<TInternalResponse<TSchemaResponse>> {
        throw new HttpErrorNotImplemented()
    }
}