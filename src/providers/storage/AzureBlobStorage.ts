//
//
//
//
//
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { Readable } from "node:stream"
//
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { TConvertParams } from "../../lib/TypeHelper"
import { absStorageProvider } from '../absStorageProvider'
import { TConfigSource } from "../../types/TConfig"
import { TFilesDataOptions } from "../data/FilesData"


//
export type TAzureBlobStorageConfig = {
    "az-blob-connection-string"?: string
    "az-blob-container"?: string
    "az-blob-autocreate"?: boolean
}

type TAzureBlobStorageParams = Required<{
    [K in keyof TAzureBlobStorageConfig as K extends `az-blob-${infer U}` ? TConvertParams<U> : K]: TAzureBlobStorageConfig[K]
}>


//
export class AzureBlobStorage extends absStorageProvider {
    ConfigSource?: TConfigSource | undefined
    ConfigStorage?: TFilesDataOptions | undefined

    Params: TAzureBlobStorageParams | undefined

    // Azure Blob
    #BlobServiceClient: BlobServiceClient | undefined
    #ContainerClient: ContainerClient | undefined

    @Logger.LogFunction()
    Init(): void {
        Logger.Debug("AzureBlobStorage.Init")
        if (!this.ConfigStorage)
            throw new HttpErrorInternalServerError('AzureBlobStorage: No configuration defined')

        this.Params = <TAzureBlobStorageParams>{
            connectionString: this.ConfigStorage["az-blob-connection-string"],
            container: this.ConfigStorage["az-blob-container"],
            autocreate: this.ConfigStorage["az-blob-autocreate"] || false
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('AzureBlobStorage: No params defined')

        const { connectionString, container } = this.Params

        try {
            if (!connectionString || !container) {
                Logger.Error('AzureBlobStorage: Missing Azure Blob Storage connection string or container name')
                this.Disconnect()
                return
            }
            this.#BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
            this.#ContainerClient = this.#BlobServiceClient.getContainerClient(container)
            await this.#ContainerClient.createIfNotExists()
        } catch (error) {
            Logger.Error(`AzureBlobStorage Error: ${error}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#BlobServiceClient = undefined
        this.#ContainerClient = undefined
    }

    @Logger.LogFunction()
    async IsConnected(): Promise<boolean> {
        if (!this.#ContainerClient) {
            Logger.Error('AzureBlobStorage: Connection to Azure Blob Storage not established')
            return false
        }
        return true
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        if (!this.#ContainerClient) {
            throw new HttpErrorInternalServerError('AzureBlobStorage: Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        return await blobClient.exists()
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        if (!this.#ContainerClient)
            throw new HttpErrorInternalServerError('Connection to Azure Blob Storage not established')

        try {
            const blobClient = this.#ContainerClient.getBlockBlobClient(file)

            if (!await blobClient.exists())
                throw new HttpErrorNotFound(`File '${file}' does not exist`)

            return Readable.from(await blobClient.downloadToBuffer(0))

        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (!this.#ContainerClient)
            throw new HttpErrorInternalServerError('Connection to Azure Blob Storage not established')

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        await blobClient.uploadStream(content)
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        if (!this.#ContainerClient)
            throw new HttpErrorInternalServerError('AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobs = this.#ContainerClient.listBlobsFlat()
        const result: TJson[] = []

        for await (const blob of blobs) {
            result.push({
                name: blob.name,
                type: 'file',
                size: blob.properties.contentLength
            })
        }
        return new DataTable(undefined, result)
    }
}
