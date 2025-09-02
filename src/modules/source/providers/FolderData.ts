//
//
//
import _ from 'lodash'
//
import { absDataProvider } from '../base/absDataProvider'
import { DATA_PROVIDER } from "../@consts"
import { TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestInsert, TSchemaRequestUpdate, TSchemaRequestDelete, TSchemaRequest } from '../../schema/types/TSchemaRequest'
import { TInternalResponse } from '../../schema/types/TInternalResponse'
import { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import { TRow } from '../../../types/DataTable'
import { HttpErrorBadRequest, HttpErrorInternalServerError, HttpErrorNotImplemented } from '../../errors/HttpErrors'
import { TConfigSource } from "../types/TConfigSource"
import { Logger, VERBOSITY } from '../../../utils/Logger'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { HttpResponse } from '../../core/HttpResponse'
import { RESPONSE } from '../../core/@consts'
import { TContext } from '../../sandbox/types/TContext'
import { TOptionalParameter } from '../types/TOptionalParameter'
import { Cache } from "../../cache/Cache"
import { Assert } from '../../../utils/Assert'
import { STORAGE } from '../../storage/@consts'
import { TStorageFile } from '../../storage/@types'
import { absStorageProvider } from '../../storage/base/absStorageProvider'
import { StorageProvider } from '../../storage/StorageProvider'
import { TStorageConfig } from '../../storage/types/TStorageConfig'


//
export type TFolderDataOptions = {
    storage?: STORAGE
    autocreate?: boolean
    "folder-pattern": string
    "files-pattern": string
} & TStorageConfig

export type TFolderDataConfig = {
    provider: DATA_PROVIDER.FOLDER
    options: TFolderDataOptions
}


//
export class FolderData extends absDataProvider {

    ProviderName = DATA_PROVIDER.FOLDER
    SourceName?: string
    Config: TFolderDataConfig = <TFolderDataConfig>{}
    Connection?: absStorageProvider = undefined

    DEFAULT: Partial<TFolderDataConfig> = {
        options: {
            storage: STORAGE.FILESYSTEM,
            autocreate: false,
            "folder-pattern": "*.*",
            "files-pattern": "*.*"
        } as TFolderDataOptions
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(source: string, sourceConfig: TConfigSource): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = _.merge(this.DEFAULT, sourceConfig as TFolderDataConfig)

        const { storage } = this.Config.options

        this.Connection = await StorageProvider.GetProvider(storage as STORAGE)
        this.Connection.SetConfig(this.Config)

        // init storage
        if (this.Connection)
            this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (this.Connection)
            await this.Connection.Connect()
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.Connection)
            await this.Connection.Disconnect()
    }

    @Logger.LogFunction()
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<absStorageProvider>(this.Connection, this.Connection !== undefined, `${this.SourceName}: Storage connection not set`)
        Assert.Var<string>(schemaRequest.entity, schemaRequest.entity !== undefined, `${this.SourceName}: Folder name is required`)

        const { schema, entity } = schemaRequest

        // eslint-disable-next-line no-param-reassign
        $context = _.merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const data = (await this.Connection.FileList(entity)).FreeSql(sqlQuery)

        await Promise.all(data.Rows.map(async (row: TRow) => {
            const _file = row as TStorageFile
            row.content = await ReadableUtils.ToBase64(
                await this.Connection!.FileRead(_file.path)
            )
        }))

        if (Logger.Level == VERBOSITY.DEBUG)
            data.SetMetaData("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

        if (options?.Cache)
            await Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            },
                data
            )

        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            entity,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data
        })
    }

    @Logger.LogFunction()
    async Insert(schemaRequest: TSchemaRequestInsert): Promise<TInternalResponse<undefined>> {
        try {
            if (!this.Connection)
                throw new HttpErrorInternalServerError('Storage connection not set')

            const dirName = schemaRequest.entity
            if (!dirName)
                throw new HttpErrorBadRequest('Folder name is required')

            const row = Array.isArray(schemaRequest.data)
                ? schemaRequest.data[0]
                : schemaRequest.data
            if (!row?.name || !row?.extension || !row?.content)
                throw new HttpErrorBadRequest('Missing file fields')

            if (typeof row.content !== 'string')
                throw new HttpErrorBadRequest('File content must be a base64 string')

            if (typeof this.Connection.FileWrite !== 'function')
                throw new HttpErrorNotImplemented('Write not implemented for this storage provider')

            // Compose the file path
            const filePath = `${dirName}/${row.name}.${row.extension}`
            const buffer = Buffer.from(row.content, 'base64')
            const { Readable } = await import('stream')
            const stream = Readable.from(buffer)
            await this.Connection.FileWrite(filePath, stream)

            return {
                StatusCode: 200
            }
        } catch (err: any) {
            throw new HttpErrorInternalServerError(err.message)
        }
    }

    async Update(schemaRequest: TSchemaRequestUpdate): Promise<TInternalResponse<undefined>> {
        try {
            if (!this.Connection)
                throw new HttpErrorInternalServerError('Storage connection not set')

            const dirName = schemaRequest.entity

            if (!dirName)
                throw new HttpErrorBadRequest('Folder name is required')

            const row = Array.isArray(schemaRequest.data)
                ? schemaRequest.data[0]
                : schemaRequest.data

            if (!row?.name || !row?.extension || !row?.content)
                throw new HttpErrorBadRequest('Missing file fields')

            if (typeof row.content !== 'string')
                throw new HttpErrorBadRequest('File content must be a base64 string')

            if (typeof this.Connection.FileWrite !== 'function')
                throw new HttpErrorNotImplemented('Write not implemented for this storage provider')

            const filePath = `${dirName}/${row.name}.${row.extension}`
            const buffer = Buffer.from(row.content, 'base64')
            const { Readable } = await import('stream')
            const stream = Readable.from(buffer)

            await this.Connection.FileWrite(filePath, stream)

            return {
                StatusCode: 200
            }
        } catch (err: any) {
            throw new HttpErrorInternalServerError(err.message)
        }
    }

    async Delete(schemaRequest: TSchemaRequestDelete): Promise<TInternalResponse<undefined>> {
        try {
            if (!this.Connection)
                throw new HttpErrorInternalServerError('Storage connection not set')

            const dirName = schemaRequest.entity

            if (!dirName)
                throw new HttpErrorBadRequest('Folder name is required')

            const { name, extension } = schemaRequest.filter || {}

            if (!name || !extension)
                throw new HttpErrorBadRequest('Missing file name or extension in filter')

            if (typeof (this.Connection as any).DeleteFile !== 'function')
                throw new HttpErrorNotImplemented('DeleteFile not implemented for this storage provider')

            await (this.Connection as any).DeleteFile(dirName, `${name}.${extension}`)
            return {
                StatusCode: 200
            }
        } catch (err: any) {
            throw new HttpErrorInternalServerError(err.message)
        }
    }

    AddEntity(schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<absStorageProvider>(this.Connection, this.Connection !== undefined, `${this.SourceName}: Storage provider is not defined`)

        const { schema } = schemaRequest

        const data = await this.Connection.FolderList()
        return HttpResponse.Ok(<TSchemaResponse>{
            schema,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.MESSAGE,
            ...RESPONSE.LIST_ENTITIES.SUCCESS.STATUS,
            data
        })
    }

    EscapeEntity(entity: string): string {
        return entity
    }

    EscapeField(field: string): string {
        return field
    }
}
