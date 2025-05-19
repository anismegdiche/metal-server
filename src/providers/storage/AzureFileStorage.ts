//
//
//
//
//
import { Readable } from "stream"
//
import { ShareClient, ShareServiceClient } from "@azure/storage-file-share"
import { HttpErrorInternalServerError } from "../../server/HttpErrors"
import { TConfigSource } from "../../types/TConfig"
import { DataTable } from "../../types/DataTable"
import { absStorageProvider } from "../absStorageProvider"
import { TFilesDataOptions } from "../data/FilesData"
import { TConvertParams } from "../../lib/TypeHelper"
import { ReadableHelper } from "../../lib/ReadableHelper"


//
export type TAzureFileStorageConfig = {
    "az-file-connection-string"?: string
    "az-file-share-name"?: string
    "az-file-folder"?: string
}

type TAzureFileStorageParams = Required<{
    [K in keyof TAzureFileStorageConfig as K extends `az-file-${infer U}` ? TConvertParams<U> : K]: TAzureFileStorageConfig[K]
}>


//
export class AzureFileStorage extends absStorageProvider {
    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params : TAzureFileStorageParams | undefined

    // Azure File
    ShareServiceClient: ShareServiceClient | undefined
    ShareClient: ShareClient | undefined
    ConnectionString: string | undefined
    ShareName: string | undefined
    DirectoryPath: string | undefined

    Init(): void {
        if (!this.ConfigStorage) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No configuration defined")
        }

        const connectionString = this.ConfigStorage["az-file-connection-string"]
        const shareName = this.ConfigStorage["az-file-share-name"]
        const folder = this.ConfigStorage["az-file-folder"]

        this.ConnectionString = connectionString?.toString()
        this.ShareName = shareName?.toString()
        this.DirectoryPath = directory?.toString() ?? "/"

        if (!this.ConnectionString) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No connection string defined")
        }
        if (!this.ShareName) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No share name defined")
        }
    }

    async Connect(): Promise<void> {
        if (!this.ConnectionString) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No connection string defined")
        }
        if (!this.ShareName) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No share name defined")
        }

        try {
            this.ShareServiceClient = ShareServiceClient.fromConnectionString(this.ConnectionString)
            this.ShareClient = this.ShareServiceClient.getShareClient(this.ShareName)
        } catch (error: unknown) {
            throw new HttpErrorInternalServerError(`AzureFileStorage: Connection failed - ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }
    
    async Disconnect(): Promise<void> {
        this.ShareServiceClient = undefined
        this.ShareClient = undefined
    }

    async IsExist(file: string): Promise<boolean> {
        if (!this.ShareClient) {
            throw new HttpErrorInternalServerError("AzureFileStorage: Not connected")
        }

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.DirectoryPath!)
            const fileClient = directoryClient.getFileClient(file)
            return await fileClient.exists()
        } catch (error) {
            throw new HttpErrorInternalServerError(`AzureFileStorage: Failed to check file existence - ${error}`)
        }
    }

    async Read(file: string): Promise<Readable> {
        if (!this.ShareClient) {
            throw new HttpErrorInternalServerError("AzureFileStorage: Not connected")
        }

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.DirectoryPath!)
            const fileClient = directoryClient.getFileClient(file)
            const downloadResponse = await fileClient.download()
            return downloadResponse.readableStreamBody as Readable
        } catch (error: any) {
            if (error.message === 'ShareFileNotFound') {
                throw new HttpErrorInternalServerError('File not found')
            }
            throw new HttpErrorInternalServerError(`AzureFileStorage: Failed to read file - ${error}`)
        }
    }

    async Write(file: string, content: Readable): Promise<void> {
        if (!this.ShareClient) {
            throw new HttpErrorInternalServerError("AzureFileStorage: Not connected")
        }

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.DirectoryPath!)
            const fileClient = directoryClient.getFileClient(file)
            
            // Convert stream to buffer
            const buffer = await ReadableHelper.ToBuffer(content)
            
            // Create and upload file
            await fileClient.create(buffer.length, {
                abortSignal: AbortSignal.timeout(30000) // 30 second timeout
            })
            
            await fileClient.uploadRange(buffer, 0, buffer.length, {
                abortSignal: AbortSignal.timeout(30000) // 30 second timeout
            })
        } catch (error) {
            throw new HttpErrorInternalServerError(
                `AzureFileStorage: Failed to write file - ${error instanceof Error ? error.message : 'Unknown error'}`
            )
        }
    }

    async List(): Promise<DataTable> {
        if (!this.ShareClient) {
            throw new HttpErrorInternalServerError("AzureFileStorage: Not connected")
        }

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.DirectoryPath!)
            const result = []

            for await (const file of directoryClient.listFilesAndDirectories()) {
                if (file.kind === "file") {
                    result.push({
                        name: file.name,
                        size: file.properties?.contentLength ?? 0,
                        type: "file"
                    })
                }
            }

            return new DataTable(undefined, result)
        } catch (error) {
            throw new HttpErrorInternalServerError(`AzureFileStorage: Failed to list files - ${error}`)
        }
    }
}
