//
//
//
import { merge } from "lodash-es"
import { Readable } from "node:stream"
import z from 'zod'
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import type { TConvertParams } from "../../../utils/TypeUtils"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"
import type { TStorageFile, TStorageFolder } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'
import { HttpErrorInternalServerError, NormalizeError } from "../../errors/HttpErrors"


//
const z_U__source_storage_azblob_options = z.object({
    "connection-string": z.string(),
    container: z.string(),
    autocreate: z.boolean().optional()
})


//
export type U__source_storage_azblob_options = z.infer<typeof z_U__source_storage_azblob_options>

type TAzureBlobStorageParams = {
    [K in keyof U__source_storage_azblob_options as K extends `${infer U}` ? TConvertParams<U> : K]: U__source_storage_azblob_options[K]
}


//
export class AzureBlobStorage extends absStorageProvider {

    Config?: U__source_storage_file_options
    Params?: TAzureBlobStorageParams

    // Azure Blob
    static _libAzureStorageBlob: typeof import('@azure/storage-blob');
    _blobServiceClient: import('@azure/storage-blob').BlobServiceClient | undefined
    _containerClient: import('@azure/storage-blob').ContainerClient | undefined

    DEFAULT: Partial<U__source_storage_azblob_options> = {
        autocreate: false
    }

    static async _loadAzureStorageBlob(): Promise<typeof import('@azure/storage-blob')> {
        if (!this._libAzureStorageBlob) {
            this._libAzureStorageBlob = await import('@azure/storage-blob');
        }
        return this._libAzureStorageBlob;
    }

    IsConfigValid(): boolean {
        return z_U__source_storage_azblob_options.safeParse(this.Config).success
    }

    @Logger.LogFunction()
    Init(): void {
        Assert.Var<U__source_storage_azblob_options>(this.Config, this.IsConfigValid(), 'No config storage defined')
        this.Config = merge(this.DEFAULT, this.Config)

        this.Params = {
            connectionString: this.Config["connection-string"],
            container: this.Config.container,
            autocreate: this.Config.autocreate
        }

        Assert.Var<string>(this.Params.connectionString, 'No connection string defined')
        Assert.Var<string>(this.Params.container, 'No container name defined')
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAzureBlobStorageParams>(this.Params, 'No params defined')
        Assert.Condition(!!this.Params.connectionString && this.Params.connectionString.trim() !== '', 'No connection string defined')
        Assert.Condition(!!this.Params.container && this.Params.container.trim() !== '', 'No container name defined')
        
        try {
            const { connectionString, container, autocreate } = this.Params

            const azureStorageBlob = await AzureBlobStorage._loadAzureStorageBlob();
            this._blobServiceClient = azureStorageBlob.BlobServiceClient.fromConnectionString(connectionString)
            this._containerClient = this._blobServiceClient.getContainerClient(container)

            // Create container if autocreate is enabled
            if (autocreate) {
                await this._containerClient.createIfNotExists()
            }

        } catch (e: unknown) {
            const _e = NormalizeError(e)
            throw new HttpErrorInternalServerError(`Azure Blob Storage Error: ${_e.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._blobServiceClient = undefined
        this._containerClient = undefined
    }

    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        this.CheckPaths([dirName])

        Assert.Var<string>(dirName, 'No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(
            this._containerClient,
            'Connection to Azure Blob Storage not established'
        )

        const prefix = dirName + "/"
        for await (const _ of this._containerClient.listBlobsByHierarchy("/", { prefix })) {
            return true
        }
        return false
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        this.CheckPaths([dirName])

        Assert.Var<string>(dirName, 'No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(
            this._containerClient,
            'Connection to Azure Blob Storage not established'
        )

        const blobClient = this._containerClient.getBlockBlobClient(dirName + "/")
        await blobClient.uploadData(Buffer.alloc(0))
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const delimiter = '/'
        const iter = this._containerClient.listBlobsByHierarchy(delimiter, { prefix: '' })
        const result: TStorageFolder[] = []

        for await (const item of iter) {
            if (item.kind === 'prefix') {
                const folderName = item.name.replace(/\/$/, '')
                result.push(JsonUtils.RemoveUndefined(
                    <TStorageFolder>{
                        name: folderName,
                        type: DATA_ENTITY_TYPE.FOLDER
                    }
                ))
            }
        }

        return new DataTable(undefined, result)
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName: string): Promise<DataTable> {
        this.CheckPaths([dirName])

        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const prefix = dirName + "/"
        const blobs = this._containerClient.listBlobsFlat({ prefix })
        const result: TStorageFile[] = []

        for await (const blob of blobs) {
            if (blob.name.endsWith('/')) continue

            result.push(JsonUtils.RemoveUndefined(
                <TStorageFile>{
                    name: blob.name.slice(prefix.length),
                    mimeType: this.GetMimeType(blob.name),
                    type: DATA_ENTITY_TYPE.FILE,
                    size: blob.properties.contentLength,
                    createdAt: blob.properties.createdOn,
                    modifiedAt: blob.properties.lastModified,
                    path: blob.name
                }
            ))
        }

        return new DataTable(dirName, result)
    }

    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        return blobClient.exists()
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        Assert.Condition(await blobClient.exists(), `File '${fileName}' does not exist`)

        return Readable.from(await blobClient.downloadToBuffer(0))
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        await blobClient.uploadStream(content)
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        this.CheckPaths([dirName, oldFileName, newFileName])

        Assert.Var<string>(dirName, 'No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const oldBlobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, oldFileName))
        const newBlobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, newFileName))

        const copyResult = await newBlobClient.beginCopyFromURL(oldBlobClient.url)
        await copyResult.pollUntilDone()
        await oldBlobClient.delete()
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<string>(dirName, 'No dir name defined')
        Assert.Var<string>(fileName, 'No file name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        await blobClient.delete()
    }
}
