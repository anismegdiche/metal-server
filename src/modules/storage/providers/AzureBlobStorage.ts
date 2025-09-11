//
// Lazy-loaded @azure/storage-blob module
import merge from "lodash/merge"
import { Readable } from "node:stream"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import { TConvertParams } from "../../../utils/TypeUtils"
import { DATA_ENTITY } from "../../source/@consts"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { TConfigSource } from "../../source/types/TConfigSource"
import { TStorageFile, TStorageFolder } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'

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

    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions
    Params: TAzureBlobStorageParams | undefined

    // Azure Blob
    private static _azureStorageBlob: typeof import('@azure/storage-blob');
    private _blobServiceClient: import('@azure/storage-blob').BlobServiceClient | undefined
    private _containerClient: import('@azure/storage-blob').ContainerClient | undefined

    DEFAULT: Partial<TAzureBlobStorageParams> = {
        autocreate: false
    }


    private static async _loadAzureStorageBlob(): Promise<typeof import('@azure/storage-blob')> {
        if (!this._azureStorageBlob) {
            this._azureStorageBlob = await import('@azure/storage-blob');
        }
        return this._azureStorageBlob;
    }

    // -----------------------------
    // Init
    // -----------------------------
    @Logger.LogFunction()
    Init(): void {
        Assert.Var<TAzureBlobStorageConfig>(this.ConfigStorage, 'AzureBlobStorage: No config storage defined')

        this.Params = merge(
            this.DEFAULT,
            <TAzureBlobStorageParams>{
                connectionString: this.ConfigStorage["az-blob-connection-string"],
                container: this.ConfigStorage["az-blob-container"],
                autocreate: this.ConfigStorage["az-blob-autocreate"] || false
            }
        )
    }

    // -----------------------------
    // Connect / Disconnect
    // -----------------------------
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAzureBlobStorageParams>(this.Params, 'AzureBlobStorage: No params defined')
        Assert.Var<string>(this.Params.connectionString, 'AzureBlobStorage: No connection string defined')
        Assert.Var<string>(this.Params.container, 'AzureBlobStorage: No container defined')

        const { connectionString, container } = this.Params
        const azureStorageBlob = await AzureBlobStorage._loadAzureStorageBlob();
        this._blobServiceClient = azureStorageBlob.BlobServiceClient.fromConnectionString(connectionString)
        this._containerClient = this._blobServiceClient.getContainerClient(container)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._blobServiceClient = undefined
        this._containerClient = undefined
    }

    // -----------------------------
    // Folder Operations
    // -----------------------------
    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<string>(dirName, 'AzureBlobStorage: No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(
            this._containerClient,
            'AzureBlobStorage: Connection to Azure Blob Storage not established'
        )

        const prefix = dirName + "/"
        for await (const _ of this._containerClient.listBlobsByHierarchy("/", { prefix })) {
            return true
        }
        return false
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<string>(dirName, 'AzureBlobStorage: No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(
            this._containerClient,
            'AzureBlobStorage: Connection to Azure Blob Storage not established'
        )

        const blobClient = this._containerClient.getBlockBlobClient(dirName + "/")
        await blobClient.uploadData(Buffer.alloc(0))
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const delimiter = '/'
        const iter = this._containerClient.listBlobsByHierarchy(delimiter, { prefix: '' })
        const result: TStorageFolder[] = []

        for await (const item of iter) {
            if (item.kind === 'prefix') {
                const folderName = item.name.replace(/\/$/, '')
                result.push(JsonUtils.RemoveUndefined(
                    <TStorageFolder>{
                        name: folderName,
                        type: DATA_ENTITY.FOLDER
                    }
                ))
            }
        }

        return new DataTable(undefined, result)
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName: string): Promise<DataTable> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const prefix = dirName + "/"
        const blobs = this._containerClient.listBlobsFlat({ prefix })
        const result: TStorageFile[] = []

        for await (const blob of blobs) {
            if (blob.name.endsWith('/')) continue

            result.push(JsonUtils.RemoveUndefined(
                <TStorageFile>{
                    name: blob.name.slice(prefix.length),
                    mimeType: this.GetMimeType(blob.name),
                    type: DATA_ENTITY.FILE,
                    size: blob.properties.contentLength,
                    createdAt: blob.properties.createdOn,
                    modifiedAt: blob.properties.lastModified,
                    path: blob.name
                }
            ))
        }

        return new DataTable(dirName, result)
    }

    // -----------------------------
    // File Operations
    // -----------------------------
    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        return await blobClient.exists()
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        Assert.Condition(await blobClient.exists(), `File '${fileName}' does not exist`)

        return Readable.from(await blobClient.downloadToBuffer(0))
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        await blobClient.uploadStream(content)
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        Assert.Var<string>(dirName, 'AzureBlobStorage: No dir name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const oldBlobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, oldFileName))
        const newBlobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, newFileName))

        const copyResult = await newBlobClient.beginCopyFromURL(oldBlobClient.url)
        await copyResult.pollUntilDone()
        await oldBlobClient.delete()
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        Assert.Var<string>(dirName, 'AzureBlobStorage: No dir name defined')
        Assert.Var<string>(fileName, 'AzureBlobStorage: No file name defined')
        Assert.Var<import('@azure/storage-blob').ContainerClient>(this._containerClient, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this._containerClient.getBlockBlobClient(StringUtils.Url(dirName, fileName))
        await blobClient.delete()
    }
}
