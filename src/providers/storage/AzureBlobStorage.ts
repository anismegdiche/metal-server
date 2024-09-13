//
//
//
//
//
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
//
import { CommonStorage, IStorage } from "./CommonStorage"
import { Logger } from '../../utils/Logger'

type TAzureBlobStorageConfig = {
    connectionString?: string
    containerName?: string
    createContainerIfNotExists?: boolean
}

export class AzureBlobStorage extends CommonStorage implements IStorage {

    #BlobServiceClient: BlobServiceClient | undefined
    #ContainerClient: ContainerClient | undefined

    Config: TAzureBlobStorageConfig = {}

    @Logger.LogFunction()
    Init(): void {
        Logger.Debug("AzureBlobStorage.Init")
        this.Config = <TAzureBlobStorageConfig>{
            connectionString: this.Options.azureBlobConnectionString,
            containerName: this.Options.azureBlobContainerName,
            createContainerIfNotExists: this.Options.azureBlobCreateContainerIfNotExists || false
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        const { connectionString, containerName } = this.Config

        if (!connectionString || !containerName) {
            Logger.Error('AzureBlobStorage: Missing Azure Blob Storage connection string or container name')
            this.Disconnect()
            return
        }

        this.#BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        this.#ContainerClient = this.#BlobServiceClient.getContainerClient(containerName)
        await this.#ContainerClient.createIfNotExists()

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
            throw new Error('AzureBlobStorage: Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        return await blobClient.exists()
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<string> {
        if (!this.#ContainerClient) {
            throw new Error('Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        const downloadBlockBlobResponse = await blobClient.download(0)
        return await this.StreamToBuffer(downloadBlockBlobResponse.readableStreamBody!)
    }

    @Logger.LogFunction()
    async Write(file: string, content: string): Promise<void> {
        if (!this.#ContainerClient) {
            throw new Error('Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        await blobClient.upload(content, Buffer.byteLength(content))
    }
}
