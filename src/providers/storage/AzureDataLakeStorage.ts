//
//
//
//
//
import { DataLakeServiceClient, DataLakeFileSystemClient } from '@azure/storage-file-datalake'
import { Readable } from 'stream'
//
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError } from '../../server/HttpErrors'
import { TJson } from '../../types/TJson'
import { DataTable } from '../../types/DataTable'
import { absStorageProvider } from '../absStorageProvider'
import { TConfigSource } from '../../types/TConfig'
import { TFilesDataOptions } from '../data/FilesData'
import { ReadableHelper } from '../../lib/ReadableHelper'


//
export type TAzureDataLakeStorageConfig = {
    'az-datalake-storage-account': string
    'az-datalake-container-name': string
    'az-datalake-storage-key': string
}


//
export class AzureDataLakeStorage extends absStorageProvider {
    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params: TAzureDataLakeStorageConfig | undefined

    #fileSystemClient: DataLakeFileSystemClient | undefined

    @Logger.LogFunction()
    Init(): void {
        Logger.Debug('AzureDataLakeStorage.Init')
        if (!this.ConfigStorage) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: No configuration defined')
        }

        const config = this.ConfigStorage as TFilesDataOptions & TAzureDataLakeStorageConfig
        this.Params = {
            'az-datalake-storage-account': config['az-datalake-storage-account'],
            'az-datalake-container-name': config['az-datalake-container-name'],
            'az-datalake-storage-key': config['az-datalake-storage-key']
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (!this.Params) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: No params defined')
        }

        const { 'az-datalake-storage-account': storageAccount, 'az-datalake-container-name': containerName, 'az-datalake-storage-key': storageKey } = this.Params

        if (!storageAccount || !containerName || !storageKey) {
            this.Disconnect()
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: Missing required configuration')
        }

        try {
            const connectionString = `DefaultEndpointsProtocol=https;AccountName=${storageAccount};AccountKey=${storageKey};EndpointSuffix=core.windows.net`
            const serviceClient = DataLakeServiceClient.fromConnectionString(connectionString)
            this.#fileSystemClient = serviceClient.getFileSystemClient(containerName)

            // Create the container if it doesn't exist
            await this.#fileSystemClient.createIfNotExists()
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)
            Logger.Error(`AzureDataLakeStorage Error: ${errorMessage}`)
            throw new HttpErrorInternalServerError(`Failed to connect to Azure Data Lake Storage: ${errorMessage}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#fileSystemClient = undefined
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        if (!this.#fileSystemClient) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: Connection to storage not established')
        }

        try {
            const fileClient = this.#fileSystemClient.getFileClient(file)
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
    async Read(file: string): Promise<Readable> {
        if (!this.#fileSystemClient) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: Connection to storage not established')
        }

        try {
            const fileClient = this.#fileSystemClient.getFileClient(file)
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

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (!this.#fileSystemClient) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: Connection to storage not established')
        }

        try {
            const buffer = await ReadableHelper.ToBuffer(content)

            const fileClient = this.#fileSystemClient.getFileClient(file)

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
    async List(): Promise<DataTable> {
        if (!this.#fileSystemClient) {
            throw new HttpErrorInternalServerError('AzureDataLakeStorage: Connection to storage not established')
        }

        try {
            const result: TJson[] = []

            for await (const item of this.#fileSystemClient.listPaths()) {
                result.push({
                    name: item.name,
                    type: item.isDirectory
                        ? 'directory'
                        : 'file'
                })
            }

            return new DataTable(undefined, result)
        } catch (error) {
            const errorMessage = error instanceof Error
                ? error.message
                : String(error)
            throw new HttpErrorInternalServerError(`Failed to list files: ${errorMessage}`)
        }
    }
}
