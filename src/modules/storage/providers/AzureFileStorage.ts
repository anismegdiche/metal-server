//
//
//
import { Readable } from "stream"
import * as path from 'path'
//
import { ShareClient, ShareServiceClient } from "@azure/storage-file-share"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { TConfigSource } from "../../source/types/TConfigSource"
import { DataTable } from "../../../types/DataTable"
import { absStorageProvider } from "../base/absStorageProvider"
import { TStorageFolder, TStorageFile } from '../@types'
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { TConvertParams } from "../../../utils/TypeUtils"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { Logger } from "../../../utils/Logger"
import { DATA_ENTITY } from "../../source/@consts"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Assert } from "../../../utils/Assert"

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

    Params: TAzureFileStorageParams | undefined

    // Azure File
    ShareServiceClient: ShareServiceClient | undefined
    ShareClient: ShareClient | undefined
    ConnectionString: string | undefined
    ShareName: string | undefined
    Folder: string | undefined

    @Logger.LogFunction()
    Init(): void {
        if (!this.ConfigStorage) {
            throw new HttpErrorInternalServerError("AzureFileStorage: No configuration defined")
        }

        const connectionString = this.ConfigStorage["az-file-connection-string"]
        const shareName = this.ConfigStorage["az-file-share-name"]
        const folder = this.ConfigStorage["az-file-folder"]

        this.ConnectionString = connectionString?.toString()
        this.ShareName = shareName?.toString()
        this.Folder = folder?.toString() ?? "/"

        Assert<string>(this.ConnectionString, this.ConnectionString !== undefined, 'AzureFileStorage: No connection string defined')
        Assert<string>(this.ShareName, this.ShareName !== undefined, 'AzureFileStorage: No share name defined')
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder path defined')
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert<string>(this.ConnectionString, this.ConnectionString !== undefined, 'AzureFileStorage: No connection string defined')
        Assert<string>(this.ShareName, this.ShareName !== undefined, 'AzureFileStorage: No share name defined')

        try {
            this.ShareServiceClient = ShareServiceClient.fromConnectionString(this.ConnectionString)
            this.ShareClient = this.ShareServiceClient.getShareClient(this.ShareName)
        } catch (error: unknown) {
            throw new HttpErrorInternalServerError(`AzureFileStorage: Connection failed - ${error instanceof Error
                ? error.message
                : 'Unknown error'}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.ShareServiceClient = undefined
        this.ShareClient = undefined
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder defined')
        Assert<ShareClient>(this.ShareClient, this.ShareClient !== undefined, 'AzureFileStorage: Not connected')

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.Folder)
            const fileClient = directoryClient.getFileClient(file)
            return await fileClient.exists()
        } catch (error) {
            throw new HttpErrorInternalServerError(`AzureFileStorage: Failed to check file existence - ${error}`)
        }
    }

    @Logger.LogFunction()
    async FileRead(file: string): Promise<Readable> {
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder defined')
        Assert<ShareClient>(this.ShareClient, this.ShareClient !== undefined, 'AzureFileStorage: Not connected')

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.Folder)
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

    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder defined')
        Assert<ShareClient>(this.ShareClient, this.ShareClient !== undefined, 'AzureFileStorage: Not connected')

        try {
            const directoryClient = this.ShareClient.getDirectoryClient(this.Folder)
            const fileClient = directoryClient.getFileClient(file)

            // Convert stream to buffer
            const buffer = await ReadableUtils.ToBuffer(content)

            // Create and upload file
            await fileClient.create(buffer.length, {
                abortSignal: AbortSignal.timeout(30000) // 30 second timeout
            })

            await fileClient.uploadRange(buffer, 0, buffer.length, {
                abortSignal: AbortSignal.timeout(30000) // 30 second timeout
            })
        } catch (error) {
            throw new HttpErrorInternalServerError(
                `AzureFileStorage: Failed to write file - ${error instanceof Error
                    ? error.message
                    : 'Unknown error'}`
            )
        }
    }

    @Logger.LogFunction()
    async FileList(dir?: string): Promise<DataTable> {
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder defined')
        Assert<ShareClient>(this.ShareClient, this.ShareClient !== undefined, 'AzureFileStorage: Not connected')

        // Combine base folder and subfolder
        const targetFolder = dir
            ? path.posix.join(this.Folder, dir)
            : this.Folder;

        const directoryClient = this.ShareClient.getDirectoryClient(targetFolder);
        const result: TStorageFile[] = [];

        for await (const item of directoryClient.listFilesAndDirectories()) {
            if (item.kind === "file") {
                result.push(JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: item.name,
                        mimeType: this.GetMimeType(item.name),
                        type: DATA_ENTITY.FILE,
                        size: item.properties?.contentLength,
                        createdAt: item.properties?.creationTime,
                        modifiedAt: item.properties?.lastModified,
                        path: item.name
                    }))
            }
        }

        return new DataTable(undefined, result);
    }
    
    @Logger.LogFunction()
    async FolderList(folder: string = ""): Promise<DataTable> {
        Assert<string>(this.Folder, this.Folder !== undefined, 'AzureFileStorage: No folder defined')
        Assert<ShareClient>(this.ShareClient, this.ShareClient !== undefined, 'AzureFileStorage: Not connected')

        const targetFolder = folder
            ? path.posix.join(this.Folder, folder)
            : this.Folder;

        const directoryClient = this.ShareClient.getDirectoryClient(targetFolder);
        const result: TStorageFolder[] = [];

        for await (const _folder of directoryClient.listFilesAndDirectories()) {
            if (_folder.kind === "directory") {
                result.push(JsonUtils.RemoveUndefined(
                    <TStorageFolder>{
                        name: _folder.name,
                        type: DATA_ENTITY.FOLDER
                    }
                ))
            }
        }
        return new DataTable(undefined, result);
    }
}
