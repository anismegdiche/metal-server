/* eslint-disable no-continue */
//
//
//
import { DataLakeServiceClient, DataLakeFileSystemClient } from '@azure/storage-file-datalake'
import { Readable } from 'stream'
import _ from 'lodash'
//
import { Logger } from '../../../utils/Logger'
import { HttpErrorInternalServerError } from '../../../modules/errors/HttpErrors'
import { DataTable } from '../../../types/DataTable'
import { absStorageProvider } from '../base/absStorageProvider'
import { TStorageFile } from '../@types'
import { TConfigSource } from "../../source/types/TConfigSource"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { TConvertParams } from '../../../utils/TypeUtils'
import { DATA_ENTITY } from "../../source/@consts"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Assert } from '../../../utils/Assert'
import { StringUtils } from '../../../utils/StringUtils'


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
    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params: TAzureDataLakeStorageParams | undefined

    #FileSystemClient: DataLakeFileSystemClient | undefined

    DEFAULT = {}

    @Logger.LogFunction()
    Init(): void {
        Assert.Var<TAzureDataLakeStorageConfig>(this.ConfigStorage, this.ConfigStorage !== undefined, 'AzureDataLakeStorage: No configuration defined')
        this.Params = _.merge(this.DEFAULT, <TAzureDataLakeStorageParams>{
            storageAccount: this.ConfigStorage['az-datalake-storage-account'],
            containerName: this.ConfigStorage['az-datalake-container-name'],
            storageKey: this.ConfigStorage['az-datalake-storage-key']
        })
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAzureDataLakeStorageParams>(this.Params, this.Params !== undefined, 'AzureDataLakeStorage: No params defined')
        Assert.Var<string>(this.Params.storageAccount, !StringUtils.IsEmpty(this.Params.storageAccount), 'AzureDataLakeStorage: No storage account defined')
        Assert.Var<string>(this.Params.containerName, !StringUtils.IsEmpty(this.Params.containerName), 'AzureDataLakeStorage: No container name defined')
        Assert.Var<string>(this.Params.storageKey, !StringUtils.IsEmpty(this.Params.storageKey), 'AzureDataLakeStorage: No storage key defined')

        const { storageAccount, containerName, storageKey } = this.Params

        try {
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${storageAccount};AccountKey=${storageKey};EndpointSuffix=core.windows.net`
            const serviceClient = DataLakeServiceClient.fromConnectionString(connectionString)
            this.#FileSystemClient = serviceClient.getFileSystemClient(containerName)

            // Create the container if it doesn't exist
            await this.#FileSystemClient.createIfNotExists()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)

            throw new HttpErrorInternalServerError(`Failed to connect to Azure Data Lake Storage: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#FileSystemClient = undefined
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert.Var<DataLakeFileSystemClient>(this.#FileSystemClient, this.#FileSystemClient !== undefined, 'AzureDataLakeStorage: Connection to storage not established')

        try {
            const fileClient = this.#FileSystemClient.getFileClient(file)
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
    async FileRead(file: string): Promise<Readable> {
        Assert.Var<DataLakeFileSystemClient>(this.#FileSystemClient, this.#FileSystemClient !== undefined, 'AzureDataLakeStorage: Connection to storage not established')

        try {
            const fileClient = this.#FileSystemClient.getFileClient(file)
            const response = await fileClient.read()

            // Return the readable stream directly
            return response.readableStreamBody as Readable
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)

            throw new HttpErrorInternalServerError(`Failed to read file: ${errorMessage}`)
        }
    }

    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        Assert.Var<DataLakeFileSystemClient>(this.#FileSystemClient, this.#FileSystemClient !== undefined, 'AzureDataLakeStorage: Connection to storage not established')

        try {
            const buffer = await ReadableUtils.ToBuffer(content)

            const fileClient = this.#FileSystemClient.getFileClient(file)

            await fileClient.create()
            await fileClient.append(buffer, 0, buffer.length)
            await fileClient.flush(buffer.length)

            Logger.Debug(`File '${file}' uploaded successfully`)
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)
            throw new HttpErrorInternalServerError(`Failed to write file: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async FileList(dir?: string): Promise<DataTable> {
        Assert.Var<DataLakeFileSystemClient>(this.#FileSystemClient, this.#FileSystemClient !== undefined, 'AzureDataLakeStorage: Connection to storage not established')

        try {
            const files: TStorageFile[] = []

            for await (const item of this.#FileSystemClient.listPaths({ path: dir })) {
                if (!item.name || item.isDirectory)
                    continue

                files.push(JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: item.name.split('/').pop(),
                        mimeType: this.GetMimeType(item.name),
                        type: DATA_ENTITY.FILE,
                        size: item?.contentLength,
                        createdAt: item?.createdOn,
                        modifiedAt: item?.lastModified,
                        path: item.name
                    }))
            }
            return new DataTable(undefined, files)

        } catch (error: unknown) {
            throw new HttpErrorInternalServerError(`Failed to list files: ${(error as Error).message}`)
        }
    }

    @Logger.LogFunction()
    async FolderList(): Promise<DataTable> {
        Assert.Var<DataLakeFileSystemClient>(this.#FileSystemClient, this.#FileSystemClient !== undefined, 'AzureDataLakeStorage: Connection to storage not established')

        const folders: TStorageFile[] = []
        for await (const item of this.#FileSystemClient.listPaths()) {
            if (!item.name || !item.isDirectory)
                continue

            folders.push(JsonUtils.RemoveUndefined(
                <TStorageFile>{
                    name: item.name.split('/').pop() ?? '',
                    type: DATA_ENTITY.FOLDER
                }
            ))
        }
        return new DataTable(undefined, folders)
    }
}
