//
//
//
//
//
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
//
import { CommonStorage, IStorage } from "./CommonStorage"


export class AzureBlobStorage extends CommonStorage implements IStorage {

    #BlobServiceClient: BlobServiceClient | undefined
    #ContainerClient: ContainerClient | undefined

    async Connect(): Promise<void> {
        const { azureBlobConnectionString: connectionString, azureBlobContainerName: containerName } = this.Options

        if (!connectionString || !containerName) {
            throw new Error('Missing Azure Blob Storage connection string or container name')
        }

        this.#BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        this.#ContainerClient = this.#BlobServiceClient.getContainerClient(containerName)
    }

    async Disconnect(): Promise<void> {
        // You may close connections or release resources here
        this.#BlobServiceClient = undefined
        this.#ContainerClient = undefined
    }

    async IsExist(file: string): Promise<boolean> {
        if (!this.#ContainerClient) {
            throw new Error('Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        return await blobClient.exists()
    }

    async Read(file: string): Promise<string> {
        if (!this.#ContainerClient) {
            throw new Error('Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        const downloadBlockBlobResponse = await blobClient.download(0)
        return await this.StreamToBuffer(downloadBlockBlobResponse.readableStreamBody!)
    }

    async Write(file: string, content: string): Promise<void> {
        if (!this.#ContainerClient) {
            throw new Error('Connection to Azure Blob Storage not established')
        }

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        await blobClient.upload(content, Buffer.byteLength(content))
    }
}
