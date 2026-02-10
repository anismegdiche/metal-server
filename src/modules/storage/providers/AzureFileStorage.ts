//
// Lazy-loaded @azure/storage-file-share module
import { Readable } from "stream"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { StringUtils } from "../../../utils/StringUtils"
import type { TConvertParams } from "../../../utils/TypeUtils"
import type { U_config_sources_source } from "../../core/types/U_config_sources"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"
import type { TStorageFile, TStorageFolder } from '../@types'
import { absStorageProvider } from "../base/absStorageProvider"

//
export type U__source_storage_azfs_options = {
    "az-file-connection-string"?: string
    "az-file-share-name"?: string
    "az-file-folder"?: string
}

type TAzureFileStorageParams = {
    [K in keyof U__source_storage_azfs_options as K extends `az-file-${infer U}` ? TConvertParams<U> : K]: U__source_storage_azfs_options[K]
}

//
export class AzureFileStorage extends absStorageProvider {

    ConfigSource?: U_config_sources_source
    ConfigStorage?: U__source_storage_file_options
    Params?: TAzureFileStorageParams

    DEFAULT: Partial<TAzureFileStorageParams> = {
        folder: "/"
    }

    // Azure File
    private _shareServiceClient?: import('@azure/storage-file-share').ShareServiceClient
    _shareClient?: import('@azure/storage-file-share').ShareClient
    private static _azureStorageFileShare: typeof import('@azure/storage-file-share');

    private static async _loadAzureStorageFileShare(): Promise<typeof import('@azure/storage-file-share')> {
        if (!this._azureStorageFileShare) {
            this._azureStorageFileShare = await import('@azure/storage-file-share');
        }
        return this._azureStorageFileShare;
    }

    // -----------------------------
    // Init
    // -----------------------------
    @Logger.LogFunction()
    Init(): void {
        Assert.Var<U__source_storage_azfs_options>(this.ConfigStorage, 'No config storage defined')

        this.Params = {
            ...this.DEFAULT,
            connectionString: this.ConfigStorage["az-file-connection-string"],
            shareName: this.ConfigStorage["az-file-share-name"],
            folder: this.ConfigStorage["az-file-folder"]
        }

        Assert.Var<string>(this.Params?.connectionString, 'No connection string defined')
        Assert.Var<string>(this.Params?.shareName, 'No share name defined')
        Assert.Var<string>(this.Params?.folder, 'No folder path defined')
    }

    // -----------------------------
    // Connect / Disconnect
    // -----------------------------
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<string>(this.Params?.connectionString, 'No connection string defined')
        Assert.Var<string>(this.Params?.shareName, 'No share name defined')

        try {
            const azureStorageFileShare = await AzureFileStorage._loadAzureStorageFileShare();
            this._shareServiceClient = azureStorageFileShare.ShareServiceClient.fromConnectionString(this.Params?.connectionString)
            this._shareClient = this._shareServiceClient.getShareClient(this.Params?.shareName)
        } catch (error: unknown) {
            throw new HttpErrorInternalServerError(`Connection failed - ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._shareServiceClient = undefined
        this._shareClient = undefined
    }

    // -----------------------------
    // Folder Operations
    // -----------------------------
    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')
        Assert.Var<string>(dirName, 'Directory name is required')

        const directoryClient = this._shareClient.getDirectoryClient(dirName)
        return directoryClient.exists()
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')
        Assert.Var<string>(dirName, 'Directory name is required')

        const directoryClient = this._shareClient.getDirectoryClient(dirName)
        await directoryClient.create()
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<string>(this.Params?.folder, 'No folder defined')
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')

        const directoryClient = this._shareClient.getDirectoryClient(this.Params?.folder);
        const folders: TStorageFolder[] = [];

        for await (const _folder of directoryClient.listFilesAndDirectories()) {
            if (_folder.kind === "directory") {
                folders.push(JsonUtils.RemoveUndefined(<TStorageFolder>{
                    name: _folder.name,
                    type: DATA_ENTITY_TYPE.FOLDER
                }))
            }
        }
        return new DataTable(undefined, folders);
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName?: string): Promise<DataTable> {
        Assert.Var<string>(this.Params?.folder, 'No folder defined')
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')

        const targetFolder = dirName ? StringUtils.Path(this.Params?.folder, dirName) : this.Params?.folder;
        const directoryClient = this._shareClient.getDirectoryClient(targetFolder);
        const result: TStorageFile[] = [];

        for await (const item of directoryClient.listFilesAndDirectories()) {
            if (item.kind === "file") {
                result.push(JsonUtils.RemoveUndefined(<TStorageFile>{
                    name: item.name,
                    mimeType: this.GetMimeType(item.name),
                    type: DATA_ENTITY_TYPE.FILE,
                    size: item.properties?.contentLength,
                    createdAt: item.properties?.creationTime,
                    modifiedAt: item.properties?.lastModified,
                    path: item.name
                }))
            }
        }

        return new DataTable(dirName, result);
    }

    // -----------------------------
    // File Operations
    // -----------------------------
    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<string>(this.Params?.folder, 'No folder defined')
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')

        try {
            const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
            const fileClient = directoryClient.getFileClient(fileName)
            return await fileClient.exists()
        } catch (error) {
            throw new HttpErrorInternalServerError(`Failed to check file existence - ${error}`)
        }
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<string>(this.Params?.folder, 'No folder defined')
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')

        const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
        const fileClient = directoryClient.getFileClient(fileName)
        const downloadResponse = await fileClient.download()
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to download file - ${error}`)
            })
        return downloadResponse.readableStreamBody as Readable
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        Assert.Var<string>(this.Params?.folder, 'No folder defined')
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')

        const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
        await directoryClient.createIfNotExists()

        const fileClient = directoryClient.getFileClient(fileName)
        const buffer = await ReadableUtils.ToBuffer(content)

        await fileClient.create(buffer.length, { abortSignal: AbortSignal.timeout(30000) })
        await fileClient.uploadRange(buffer, 0, buffer.length, { abortSignal: AbortSignal.timeout(30000) })
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')
        Assert.Var<string>(oldFileName, 'Old file name is required')
        Assert.Var<string>(newFileName, 'New file name is required')

        const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
        const fileClient = directoryClient.getFileClient(oldFileName)
        await fileClient.rename(newFileName)
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        Assert.Var<import('@azure/storage-file-share').ShareClient>(this._shareClient, 'Not connected')
        Assert.Var<string>(fileName, 'File name is required')

        const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
        const fileClient = directoryClient.getFileClient(fileName)
        await fileClient.delete()
    }
}
