//
//
//
// Lazy-loaded @azure/storage-file-datalake module
import { DataLakeFileSystemClient } from '@azure/storage-file-datalake'
import { merge } from 'lodash-es'
import { Readable } from 'node:stream'
//
import { HttpErrorInternalServerError } from '../../../modules/errors/HttpErrors'
import { DataTable } from '../../../types/DataTable'
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from '../../../utils/Logger'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { StringUtils } from '../../../utils/StringUtils'
import type { TConvertParams } from '../../../utils/TypeUtils'
import type { U_config_sources_source } from '../../core/types/U_config_sources'
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { TStorageFilesDataOptions } from "../../source/types/TStorageFilesDataOptions"
import type { TStorageFile } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'


//
export type TAzureDataLakeStorageConfig = {
    'az-datalake-storage-account': string
    'az-datalake-container-name': string
    'az-datalake-storage-key': string
}

type TAzureDataLakeStorageParams = Required<{
    [K in keyof TAzureDataLakeStorageConfig as K extends `az-datalake-${infer U}` ? TConvertParams<U> : K]: TAzureDataLakeStorageConfig[K]
}>


//
export class AzureDataLakeStorage extends absStorageProvider {

    ConfigSource?: U_config_sources_source
    ConfigStorage?: TStorageFilesDataOptions
    Params?: TAzureDataLakeStorageParams

    private _fileSystemClient: DataLakeFileSystemClient | undefined
    private static _azureStorageFileDatalake: typeof import('@azure/storage-file-datalake');

    DEFAULT = {}

    private static async _loadAzureStorageFileDatalake(): Promise<typeof import('@azure/storage-file-datalake')> {
        if (!this._azureStorageFileDatalake) {
            this._azureStorageFileDatalake = await import('@azure/storage-file-datalake');
        }
        return this._azureStorageFileDatalake;
    }

    // -----------------------------
    // Init
    // -----------------------------
    @Logger.LogFunction()
    Init(): void {
        Assert.Var<TAzureDataLakeStorageConfig>(this.ConfigStorage, 'No configuration defined')
        this.Params = merge(this.DEFAULT, <TAzureDataLakeStorageParams>{
            storageAccount: this.ConfigStorage['az-datalake-storage-account'],
            containerName: this.ConfigStorage['az-datalake-container-name'],
            storageKey: this.ConfigStorage['az-datalake-storage-key']
        })
    }

    // -----------------------------
    // Connect / Disconnect
    // -----------------------------
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAzureDataLakeStorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.storageAccount, !StringUtils.IsEmpty(this.Params.storageAccount), 'No storage account defined')
        Assert.Var<string>(this.Params.containerName, !StringUtils.IsEmpty(this.Params.containerName), 'No container name defined')
        Assert.Var<string>(this.Params.storageKey, !StringUtils.IsEmpty(this.Params.storageKey), 'No storage key defined')

        const { storageAccount, containerName, storageKey } = this.Params

        try {
            const azureStorageFileDatalake = await AzureDataLakeStorage._loadAzureStorageFileDatalake();
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${storageAccount};AccountKey=${storageKey};EndpointSuffix=core.windows.net`
            const serviceClient = azureStorageFileDatalake.DataLakeServiceClient.fromConnectionString(connectionString)
            this._fileSystemClient = serviceClient.getFileSystemClient(containerName)

            // Create the container if it doesn't exist
            await this._fileSystemClient.createIfNotExists()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)
            throw new HttpErrorInternalServerError(`Failed to connect to Azure Data Lake Storage: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._fileSystemClient = undefined
    }

    // -----------------------------
    // Folder Operations
    // -----------------------------
    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')
        Assert.Var<string>(dirName, 'Directory name is required')

        const directoryClient = this._fileSystemClient.getDirectoryClient(dirName)
        return directoryClient.exists()
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')
        Assert.Var<string>(dirName, 'Directory name is required')

        const directoryClient = this._fileSystemClient.getDirectoryClient(dirName)
        directoryClient.create()
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')

        const folders: TStorageFile[] = []
        for await (const item of this._fileSystemClient.listPaths()) {
            if (!item.name || !item.isDirectory) continue

            folders.push(JsonUtils.RemoveUndefined(
                <TStorageFile>{
                    name: item.name.split('/').pop() ?? '',
                    type: DATA_ENTITY_TYPE.FOLDER
                }
            ))
        }
        return new DataTable(undefined, folders)
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName?: string): Promise<DataTable> {

        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')

        const files: TStorageFile[] = []
        try {
            for await (const item of this._fileSystemClient.listPaths({ path: dirName })) {
                if (!item.name || item.isDirectory) continue

                files.push(JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: item.name.split('/').pop(),
                        mimeType: this.GetMimeType(item.name),
                        type: DATA_ENTITY_TYPE.FILE,
                        size: item?.contentLength,
                        createdAt: item?.createdOn,
                        modifiedAt: item?.lastModified,
                        path: item.name
                    }))
            }
        } catch (error) {
            throw new HttpErrorInternalServerError(`Failed to list files - ${error}`)
        }
        return new DataTable(dirName, files)
    }

    // -----------------------------
    // File Operations
    // -----------------------------
    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')

        try {
            const fileClient = this._fileSystemClient.getFileClient(StringUtils.Path(dirName, fileName))
            await fileClient.getProperties()
            return true
        } catch (error) {
            if (error instanceof Error && 'code' in error && error.code === 'ResourceNotFound') {
                return false
            }
            throw new HttpErrorInternalServerError(`Failed to check file existence: ${String(error)}`)
        }
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')

        const fileClient = this._fileSystemClient.getFileClient(StringUtils.Path(dirName, fileName))
        const response = await fileClient.read()
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to download file - ${error}`)
            })

        return response.readableStreamBody as Readable
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {

        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')
        Assert.Var<Readable>(content, 'Content is required')
        Assert.Var<string>(fileName, 'File name is required')
        Assert.Var<string>(dirName, 'Directory name is required')

        try {
            const buffer = await ReadableUtils.ToBuffer(content)
            const fileClient = this._fileSystemClient.getFileClient(StringUtils.Path(dirName, fileName))

            await fileClient.create()
            await fileClient.append(buffer, 0, buffer.length)
            await fileClient.flush(buffer.length)
        } catch (error) {
            throw new HttpErrorInternalServerError(`Failed to upload file - ${error}`)
        }

        Logger.Debug(`File '${fileName}' uploaded successfully`)
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')
        Assert.Var<string>(oldFileName, 'Old file name is required')
        Assert.Var<string>(newFileName, 'New file name is required')

        await this.FileWrite(dirName, newFileName, await this.FileRead(dirName, oldFileName))
        await this.FileDelete(dirName, oldFileName)
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, 'Connection to storage not established')
        Assert.Var<string>(fileName, 'File name is required')

        const fileClient = this._fileSystemClient.getFileClient(StringUtils.Path(dirName, fileName))
        await fileClient.delete()
    }
}
