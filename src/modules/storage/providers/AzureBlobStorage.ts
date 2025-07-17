/* eslint-disable no-continue */
//
//
//
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob'
import { Readable } from "node:stream"
import _ from 'lodash'
//
import { Logger } from '../../../utils/Logger'
import { DataTable } from "../../../types/DataTable"
import { TConvertParams } from "../../../utils/TypeUtils"
import { absStorageProvider } from '../base/absStorageProvider'
import { TStorageFolder , TStorageFile } from '../@types'
import { TConfigSource } from "../../source/types/TConfigSource"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { DATA_ENTITY } from "../../source/@consts"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Assert } from '../../../utils/Assert'


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
    #BlobServiceClient: BlobServiceClient | undefined
    #ContainerClient: ContainerClient | undefined

    DEFAULT: Partial<TAzureBlobStorageParams> = {
        autocreate: false
    }

    @Logger.LogFunction()
    Init(): void {
        Assert<TAzureBlobStorageParams>(this.ConfigStorage, this.ConfigStorage !== undefined, 'AzureBlobStorage: No config storage defined')

        this.Params = _.merge(
            this.DEFAULT,
            <TAzureBlobStorageParams>{
                connectionString: this.ConfigStorage["az-blob-connection-string"],
                container: this.ConfigStorage["az-blob-container"],
                autocreate: this.ConfigStorage["az-blob-autocreate"] || false
            }
        )
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert<TAzureBlobStorageParams>(this.Params, this.Params !== undefined, 'AzureBlobStorage: No params defined')
        Assert<string>(this.Params.connectionString, this.Params.connectionString !== undefined, 'AzureBlobStorage: No connection string defined')
        Assert<string>(this.Params.container, this.Params.container !== undefined, 'AzureBlobStorage: No container defined')

        const { connectionString, container } = this.Params
        this.#BlobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
        this.#ContainerClient = this.#BlobServiceClient.getContainerClient(container)
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#BlobServiceClient = undefined
        this.#ContainerClient = undefined
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert<ContainerClient>(this.#ContainerClient, this.#ContainerClient !== undefined, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        return await blobClient.exists()
    }

    @Logger.LogFunction()
    async FileRead(file: string): Promise<Readable> {
        Assert<ContainerClient>(this.#ContainerClient, this.#ContainerClient !== undefined, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        Assert(await blobClient.exists(), `File '${file}' does not exist`)

        return Readable.from(await blobClient.downloadToBuffer(0))
    }

    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        Assert<ContainerClient>(this.#ContainerClient, this.#ContainerClient !== undefined, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const blobClient = this.#ContainerClient.getBlockBlobClient(file)
        await blobClient.uploadStream(content)
    }

    @Logger.LogFunction()
    async FileList(dir: string): Promise<DataTable> {
        Assert<ContainerClient>(this.#ContainerClient, this.#ContainerClient !== undefined, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const prefix = dir.endsWith('/')
            ? dir
            : `${dir}/`

        const blobs = this.#ContainerClient.listBlobsFlat({ prefix })
        const result: TStorageFile[] = []

        for await (const blob of blobs) {
            // Skip blobs that are not immediate children (i.e., nested deeper)
            const relativePath = blob.name.slice(prefix.length)
            if (relativePath.includes('/'))
                continue

            // Skip blobs that represent folders (just in case)
            if (blob.name.endsWith('/'))
                continue

            result.push(JsonUtils.RemoveUndefined(
                <TStorageFile>{
                    name: blob.name,
                    mimeType: this.GetMimeType(blob.name),
                    type: DATA_ENTITY.FILE,
                    size: blob.properties?.contentLength,
                    createdAt: blob.properties?.createdOn,
                    modifiedAt: blob.properties?.lastModified,
                    path: blob.name
                }))
        }

        return new DataTable(undefined, result)
    }
    
    @Logger.LogFunction()
    async FolderList(dir: string = ""): Promise<DataTable> {
        Assert<ContainerClient>(this.#ContainerClient, this.#ContainerClient !== undefined, 'AzureBlobStorage: Connection to Azure Blob Storage not established')

        const prefix = dir.endsWith('/')
? dir
: `${dir}/`
        const delimiter = '/'
        const iter = this.#ContainerClient.listBlobsByHierarchy(delimiter, { prefix })
        const result: TStorageFolder[] = []

        for await (const item of iter) {
            if (item.kind === 'prefix') {
                const folderName = item.name.slice(prefix.length).replace(/\/$/, '')
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
}
