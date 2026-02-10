//
//
//
// lodash
import { merge } from 'lodash-es'
import { Readable } from 'node:stream'
//
import type { TRow } from '../../../types/DataTable'
import { DataTable } from '../../../types/DataTable'
import { Assert } from '../../../utils/Assert'
import { Logger, VERBOSITY } from '../../../utils/Logger'
import { Mutex } from '../../../utils/Mutex'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { StringUtils } from '../../../utils/StringUtils'
import { Cache } from "../../cache/Cache"
import { RESPONSE } from '../../core/@consts'
import { HttpResponse } from '../../core/HttpResponse'
import type { TInternalResponse } from '../../core/types/TInternalResponse'
import type { U_config_sources_source } from '../../core/types/U_config_sources'
import { HttpErrorBadRequest, HttpErrorForbidden, HttpErrorInternalServerError, HttpErrorNotImplemented } from '../../errors/HttpErrors'
import type { TContext } from '../../sandbox/types/TContext'
import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../../schema/types/TSchemaRequest'
import type { TSchemaResponse } from '../../schema/types/TSchemaResponse'
import { STORAGE } from '../../storage/@consts'
import type { TStorageFile } from '../../storage/@types'
import { absStorageProvider } from '../../storage/base/absStorageProvider'
import { StorageProvider } from '../../storage/StorageProvider'
import type { U__source_storage_options } from "../../storage/@types"
import { DATA_PROVIDER } from "../@consts"
import { absDataProvider } from '../base/absDataProvider'
import type { TOptionalParameter } from "../@types"


//
const FLD_CONTENT = "content"
const FLD_OLD_NAME = "old_name"


//
export type U__source_storage_folder_options = {
    storage?: STORAGE
    autocreate?: boolean
    "allow-delete"?: boolean
    "folders-pattern": string
    "files-pattern": string
} & U__source_storage_options

export type TStorageFoldersDataConfig = {
    provider: DATA_PROVIDER.STORAGE
    options: U__source_storage_folder_options
}


//
export class StorageFoldersData extends absDataProvider {

    SourceName?: string
    ProviderName = DATA_PROVIDER.STORAGE
    Config: TStorageFoldersDataConfig = <TStorageFoldersDataConfig>{}
    Connection?: absStorageProvider

    // FolderData
    Lock: Map<string, Mutex> = new Map<string, Mutex>()
    LockTimestamps: Map<string, number> = new Map<string, number>()
    LockCleanupInterval = 300000 // 5 minutes
    LockCleanupTimer?: NodeJS.Timeout

    DEFAULT: Partial<TStorageFoldersDataConfig> = {
        options: {
            storage: STORAGE.FILESYSTEM,
            autocreate: true,
            "allow-delete": false,
            "folders-pattern": "*.*",
            "files-pattern": "*.*"
        } as U__source_storage_folder_options
    }

    constructor() {
        super()
    }

    setLock(fileName: string) {
        if (!this.Lock.has(fileName))
            this.Lock.set(fileName, new Mutex())
        this.LockTimestamps.set(fileName, Date.now())
    }

    cleanupLock(fileName: string) {
        // Remove lock if it hasn't been used in the last cleanup interval
        const lastUsed = this.LockTimestamps.get(fileName)
        if (lastUsed && Date.now() - lastUsed > this.LockCleanupInterval) {
            this.Lock.delete(fileName)
            this.LockTimestamps.delete(fileName)
        }
    }

    async cleanupAllLocks() {
        const now = Date.now()
        const toDelete: string[] = []
        for (const [fileName, lastUsed] of this.LockTimestamps.entries()) {
            if (now - lastUsed > this.LockCleanupInterval) {
                toDelete.push(fileName)
            }
        }
        toDelete.forEach(fileName => {
            this.Lock.delete(fileName)
            this.LockTimestamps.delete(fileName)
        })
        if (toDelete.length > 0) {
            Logger.Debug(`${this.SourceName}: Cleaned up ${toDelete.length} unused locks`)
        }
    }

    startLockCleanup() {
        // Run cleanup every 5 minutes
        this.LockCleanupTimer = setInterval(() => {
            this.cleanupAllLocks()
        }, this.LockCleanupInterval)
        Logger.Debug(`${this.SourceName}: Lock cleanup timer started (interval: ${this.LockCleanupInterval}ms)`)
    }

    stopLockCleanup() {
        if (this.LockCleanupTimer) {
            clearInterval(this.LockCleanupTimer)
            this.LockCleanupTimer = undefined
            Logger.Debug(`${this.SourceName}: Lock cleanup timer stopped`)
        }
    }

    @Logger.LogFunction(true)
    async Init(source: string, sourceConfig: U_config_sources_source): Promise<void> {
        await super.Init(source, sourceConfig)
        this.Config = merge(this.DEFAULT, sourceConfig as TStorageFoldersDataConfig)

        const { storage } = this.Config.options

        this.Connection = await StorageProvider.GetProvider(storage as STORAGE)
        this.Connection.SetConfig(this.Config)

        // init storage
        if (this.Connection)
            this.Connection.Init()
        else
            throw new HttpErrorInternalServerError(`${this.SourceName}: Failed to initialize storage provider`)

        // Start periodic lock cleanup
        this.startLockCleanup()
    }

    @Logger.LogFunction(true)
    async Connect(): Promise<void> {
        if (this.Connection)
            await this.Connection.Connect()
    }

    @Logger.LogFunction(true)
    async Disconnect(): Promise<void> {
        // Stop lock cleanup timer
        this.stopLockCleanup()

        // Clean up all locks before disconnecting
        await this.cleanupAllLocks()

        if (this.Connection)
            await this.Connection.Disconnect()
    }

    @Logger.LogFunction(true)
    async Select(schemaRequest: TSchemaRequestSelect, $context?: Partial<TContext>): Promise<TInternalResponse<TSchemaResponse>> {

        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage connection not set`)
        Assert.Var<string>(schemaRequest.entity, `${this.SourceName}: Folder name is required`)

        const { schema, entity: dirName } = schemaRequest

        const schemaResponse = <TSchemaResponse>{
            schema,
            entity: dirName
        }

        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        const files = await (await this.Connection.FolderListFiles(dirName))
            .FreeSql({ sqlQuery })

        if (options.Fields?.includes(FLD_CONTENT)) {
            // read files content
            await files.RowsMap(async (row: TRow) => {
                const _file = row as TStorageFile
                const _fileContent = await this.Connection!.FileRead(dirName, _file.name)
                return ReadableUtils.ToBase64(_fileContent)
                    .then(_content => {
                        _file.content = _content
                        return _file
                    })
            })
        }

        if (Logger.Level == VERBOSITY.DEBUG)
            files.MetaDataSet("__DEBUG_SOURCE_OPTIONS__", this.Config.options)

        if (options?.Cache)
            await Cache.Set({
                ...schemaRequest,
                source: this.SourceName
            },
                files
            )

        return HttpResponse.Ok(<TSchemaResponse>{
            ...schemaResponse,
            ...RESPONSE.SELECT.SUCCESS.MESSAGE,
            ...RESPONSE.SELECT.SUCCESS.STATUS,
            data: files
        })
    }

    @Logger.LogFunction(true)
    async Insert(schemaRequest: TSchemaRequestInsert, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        $context = merge(
            $context,
            this.GetContext(schemaRequest)
        )

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        Assert.Var<DataTable>(options.Data, `${this.SourceName}: Data is not defined`, new HttpErrorBadRequest())

        const dirName = schemaRequest.entity

        if (this.Config.options.autocreate && !(await this.Connection.FolderIsExist(dirName)))
            await this.Connection.FolderCreate(dirName)

        return options.Data.ForEach(
            async (row: TRow) => {
                const __file = row as TStorageFile

                Assert.Var<string>(__file.name, 'File name is required', new HttpErrorBadRequest())
                Assert.Var<string>(__file.content, 'File content is required', new HttpErrorBadRequest())
                Assert.Condition(StringUtils.IsBase64(__file.content), 'File content is not a valid base64 string', new HttpErrorBadRequest())

                this.setLock(__file.path)
                await this.Lock.get(__file.path)!.Acquire()
                try {
                    await this.Connection!.FileWrite(dirName, __file.name, Readable.from(Buffer.from(__file.content, 'base64')))
                } finally {
                    this.Lock.get(__file.path)!.Release()
                    // Optionally cleanup lock after use (commented out to rely on periodic cleanup)
                    // this.cleanupLock(__file.path)
                }
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.Created())
    }

    @Logger.LogFunction(true)
    async Update(schemaRequest: TSchemaRequestUpdate, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {

        Assert.Var<absStorageProvider>(this.Connection, 'Storage connection not set')
        // should accept only name or content or both in data

        const dirName = schemaRequest.entity
        Assert.Var<string>(dirName, 'Folder name is required', new HttpErrorBadRequest())

        if (this.Config.options.autocreate && !(await this.Connection.FolderIsExist(dirName)))
            await this.Connection.FolderCreate(dirName)

        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)
        Assert.Var<DataTable>(options.Data, `${this.SourceName}: data is not defined`, new HttpErrorBadRequest())

        const updateData = (await options.Data.Rows())[0]

        const selectQueryHelper = this.GenerateSqlSelect(schemaRequest, options)
        const selectQuery = this.GetSqlQuery(selectQueryHelper, options)
        using folderList = await this.Connection.FolderListFiles(dirName)
            .then(dt => dt.Rename(dirName))

        const files = await folderList.Pick(['name', 'path'])

        const filesFiltered = await files.FreeSql({ sqlQuery: selectQuery })

        // add old name
        await filesFiltered.FreeSql({
            sqlQuery: `
                UPDATE ${dirName}
                SET ${FLD_OLD_NAME} = name
            `
        })

        const updateQueryHelper = await this.GenerateSqlUpdate(schemaRequest, options)
        const updateQuery = this.GetSqlQuery(updateQueryHelper, options)

        await filesFiltered.FreeSql({ sqlQuery: updateQuery })

        // update files
        return filesFiltered.ForEach(
            async (row: TRow) => {
                const {
                    name: newFileName,
                    [FLD_OLD_NAME]: oldFileName
                } = row as TStorageFile & {
                    [FLD_OLD_NAME]: string
                }

                Assert.Var<string>(newFileName, 'File name is required')
                Assert.Var<string>(oldFileName, 'File old name is required')

                const __lock = dirName + '/' + oldFileName
                this.setLock(__lock)
                await this.Lock.get(__lock)!.Acquire()

                try {
                    // update file content
                    const __fileContent = await ReadableUtils.ToBase64(
                        await this.Connection!.FileRead(dirName, oldFileName)
                    )

                    if (updateData!.content && updateData!.content !== __fileContent) {
                        const ___content = updateData!.content ?? __fileContent

                        Assert.Var<string>(___content, StringUtils.IsBase64(___content), 'content is not a valid base64 string', new HttpErrorBadRequest())

                        await this.Connection!.FileWrite(dirName, oldFileName, Readable.from(Buffer.from(___content, 'base64')))
                    }

                    // rename file
                    if (oldFileName !== newFileName)
                        await this.Connection!.FileRename(dirName, oldFileName, newFileName)
                } finally {
                    this.Lock.get(__lock)!.Release()
                    // Optionally cleanup lock after use (commented out to rely on periodic cleanup)
                    // this.cleanupLock(__lock)
                }
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.NoContent())
    }

    @Logger.LogFunction(true)
    async Delete(schemaRequest: TSchemaRequestDelete, $context?: Partial<TContext>): Promise<TInternalResponse<undefined>> {
        Assert.Condition(
            (this.Config.options?.["allow-delete"] as boolean) === true,
            `${this.SourceName}: "allow-delete" option is required to delete files`,
            new HttpErrorForbidden()
        )

        Assert.Var<absStorageProvider>(this.Connection, 'Storage connection not set')

        const { entity: dirName } = schemaRequest
        Assert.Var<string>(dirName, 'Folder name is required')

        $context = merge($context, this.GetContext(schemaRequest))

        const options: TOptionalParameter = this.Options.Parse(schemaRequest, $context)

        const sqlQueryHelper = this.GenerateSqlSelect(schemaRequest, options)

        const sqlQuery = this.GetSqlQuery(sqlQueryHelper, options)

        using files = await this.Connection.FolderListFiles(dirName)
            .then(dt => dt.Rename(dirName))

        const filesFiltered = await files.FreeSql({ sqlQuery })

        return filesFiltered.ForEach(
            async (row: TRow) => {
                const { name: fileName } = row as TStorageFile
                Assert.Var<absStorageProvider>(this.Connection, 'Storage connection not set')
                Assert.Var<string>(fileName, 'File name is required')
                await this.Connection.FileDelete(dirName, fileName)
            }
        )
            .then(() => Cache.Remove(schemaRequest))
            .then(() => HttpResponse.NoContent())
    }

    @Logger.LogFunction(true)
    AddEntity(_schemaRequest: TSchemaRequest): Promise<TInternalResponse<undefined>> {
        throw new HttpErrorNotImplemented()
    }

    @Logger.LogFunction(true)
    async ListEntities(schemaRequest: TSchemaRequestListEntities): Promise<TInternalResponse<TSchemaResponse>> {
        Assert.Var<absStorageProvider>(this.Connection, `${this.SourceName}: Storage provider is not defined`)

        const { schema } = schemaRequest

        const data = await this.Connection.FolderListFolders()
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
