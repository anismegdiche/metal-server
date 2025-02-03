/* eslint-disable no-template-curly-in-string */
//
//
//
//
//
import _ from "lodash"
import { TConfigSource } from "../../types/TConfig"
import { TInternalResponse } from "../../types/TInternalResponse"
import { TSchemaRequestListEntities, TSchemaRequest, TSchemaRequestInsert, TSchemaRequestSelect, TSchemaRequestUpdate, TSchemaRequestDelete } from "../../types/TSchemaRequest"
import { TSchemaResponse } from "../../types/TSchemaResponse"
import { Logger } from "../../utils/Logger"
import { absDataProvider } from "../absDataProvider"
import { DATA_PROVIDER } from "../DataProvider"
import { TConfigSourceWebService, WebServiceData } from "./WebServiceData"
import { WEBSERVICE } from "../WebServiceProvider"
import { CONTENT } from "../ContentProvider"
import { TUrl } from "../../@types/TUrl"
import { StringHelper } from "../../lib/StringHelper"
import { ENDPOINT } from "../absWebServiceProvider"
import { HttpErrorInternalServerError, HttpErrorNotImplemented } from "../../server/HttpErrors"


//
export type TMetalDataConfig = {
    host: TUrl
    user: string
    password: string
    schema: string
}


//
export class MetalData_v2 extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.METAL
    Config: TMetalDataConfig = <TMetalDataConfig>{}
    Connection?: WebServiceData

    DEFAULT: TMetalDataConfig = {
        host: 'http://localhost:3000',
        user: '',
        password: '',
        schema: ''
    }

    DEFAULT_WEBSERVICE_CONFIG: Partial<TConfigSourceWebService> = {
        provider: DATA_PROVIDER.WEBSERVICE,
        options: {
            type: WEBSERVICE.REST,
            content: CONTENT.JSON,
            endpoints: {
                [ENDPOINT.SESSION]: {
                    post: "/user/login",
                    "session-headers": {
                        Authorization: "Bearer: ${{ $response.body.token }}"
                    }
                },
                // [ENDPOINT.COLLECTION_LIST]: {
                //     get: "",
                //     response: "rows"
                // },
                [ENDPOINT.COLLECTION_READ]: {
                    get: "/${{ $entity }}",
                    response: "rows"
                },
                [ENDPOINT.COLLECTION_CREATE]: {
                    post: "/${{ $entity }}"
                },
                [ENDPOINT.COLLECTION_UPDATE]: {
                    patch: "/${{ $entity }}"
                },
                [ENDPOINT.COLLECTION_DELETE]: {
                    delete: "/${{ $entity }}"
                }
            }
        }
    }

    constructor() {
        super()
        this.Connection = new WebServiceData()
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeEntity(entity: string): string {
        return entity
    }

    // eslint-disable-next-line class-methods-use-this
    EscapeField(field: string): string {
        return field
    }

    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        Logger.Debug("MetalData.Init")
        this.SourceName = source
        // CURRENT this.Params confuse with Config, use for all data providers RawConfig and Config
        this.Config = _.merge(
            this.DEFAULT, 
            sourceConfig
        )
        const webServiceConfig = _.merge(
            this.DEFAULT_WEBSERVICE_CONFIG,
            {
                host: StringHelper.Url(
                    this.Config.host,
                    "schema",
                    this.Config.schema
                ),
                options: {
                    endpoints: {
                        session: {
                            data: {
                                username: this.Config.user,
                                password: this.Config.password
                            }
                        }
                    }
                }
            }
        ) as TConfigSource

        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        this.Connection.Init(this.SourceName, webServiceConfig)
    }

    async Connect(): Promise<void> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        await this.Connection.Connect()
    }

    async Disconnect(): Promise<void> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        await this.Connection.Disconnect()
    }

    async Select(schemaRequest: TSchemaRequestSelect): Promise<TInternalResponse<TSchemaResponse>> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        const intResp = await this.Connection.Select(schemaRequest)
        if (!intResp)
            throw new HttpErrorInternalServerError("Select failed")

        return intResp
    }

    async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        const intResp = await this.Connection.Insert(schemaRequest)
        if (!intResp)
            throw new HttpErrorInternalServerError("Insert failed")

        return intResp
    }

    async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        const intResp = await this.Connection.Update(schemaRequest)
        if (!intResp)
            throw new HttpErrorInternalServerError("Update failed")

        return intResp
    }

    async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        const intResp = await this.Connection.Delete(schemaRequest)
        if (!intResp)
            throw new HttpErrorInternalServerError("Delete failed")

        return intResp
    }

    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        if (!this.Connection)
            throw new HttpErrorInternalServerError("Connection not initialized")

        const intResp = await this.Connection.ListEntities(schemaRequest)
        if (!intResp)
            throw new HttpErrorInternalServerError("ListEntities failed")

        return intResp
    }

    // eslint-disable-next-line class-methods-use-this
    async AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }
}