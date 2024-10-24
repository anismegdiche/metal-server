//
//
//
//
//
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { Readable } from "node:stream"
//
import { CommonStorage } from "./CommonStorage"
import { IStorageProvider } from "../../types/IStorageProvider"
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"

export type TAzureBlobStorageConfig = {
    azureBlobConnectionString?: string
    azureBlobContainerName?: string
    azureBlobCreateContainerIfNotExists?: boolean
}

export class AzureBlobStorage extends CommonStorage implements IStorageProvider {

    #BlobServiceClient: BlobServiceClient | undefined
    #ContainerClient: ContainerClient | undefined

    Config: TAzureBlobStorageConfig = {}

    @Logger.LogFunction()
    Init(): void {
        Logger.Debug("AzureBlobStorage.Init")
        this.Config = <TAzureBlobStorageConfig>{
            azureBlobConnectionString: this.Options.azureBlobConnectionString,
            azureBlobContainerName: this.Options.azureBlobContainerName,
            azureBlobCreateContainerIfNotExists: this.Options.azureBlobCreateContainerIfNotExists || false
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const { azureBlobConnectionString: connectionString, azureBlobContainerName: containerName } = this.Config

        try {
            if (!connectionString || !containerName) {
                Logger.Error('AzureBlobStorage: Missing Azure Blob Storage connection string or container name')
                this.Disconnect()
                return
            }
            this.#BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
            this.#ContainerClient = this.#BlobServiceClient.getContainerClient(containerName)
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
