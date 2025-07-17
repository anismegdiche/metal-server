//
//
//
import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Readable } from "node:stream"
import { loadEsm } from 'load-esm'

import _ from 'lodash'
//
import { Logger } from '../../../utils/Logger'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { TConvertParams } from "../../../utils/TypeUtils"
import { absStorageProvider } from '../base/absStorageProvider'
import { TStorageFile } from '../@types'
import { TConfigSource } from "../../source/types/TConfigSource"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { DATA_ENTITY } from "../../source/@consts"
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Assert } from '../../../utils/Assert'


//
 
export const FileTypeFromBuffer = (async () => {
    try {
        const { fileTypeFromBuffer } = await loadEsm<typeof import('file-type')>('file-type')
        return fileTypeFromBuffer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        Logger.Error(`Error importing module:${error?.message}`)
        return undefined
    }
})()


//
export type TAmazonS3StorageConfig = {
    "s3-access-key-id"?: string
    "s3-secret-access-key"?: string
    "s3-region"?: string
    "s3-bucket"?: string
    "s3-endpoint"?: string
}

type TAmazonS3StorageParams = Required<{
    [K in keyof TAmazonS3StorageConfig as K extends `s3-${infer U}` ? TConvertParams<U> : K]: TAmazonS3StorageConfig[K]
}>


//
export class AmazonS3Storage extends absStorageProvider {
    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params: TAmazonS3StorageParams | undefined

    #S3Client: S3Client | undefined

    DEFAULT = {}

    @Logger.LogFunction()
    Init(): void {
        Assert<TAmazonS3StorageConfig>(this.ConfigStorage, this.ConfigStorage !== undefined, 'AmazonS3Storage: No configuration defined')
        this.Params = _.merge(this.DEFAULT, <TAmazonS3StorageParams>{
            accessKeyId: this.ConfigStorage["s3-access-key-id"],
            secretAccessKey: this.ConfigStorage["s3-secret-access-key"],
            region: this.ConfigStorage["s3-region"],
            bucket: this.ConfigStorage["s3-bucket"],
            endpoint: this.ConfigStorage["s3-endpoint"]
        })
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')

        const { accessKeyId, secretAccessKey, region, bucket, endpoint } = this.Params

        try {
            if (!accessKeyId || !secretAccessKey || !region || !bucket) {
                Logger.Error('AmazonS3Storage: Missing required S3 configuration')
                this.Disconnect()
                return
            }

            const clientConfig = {
                credentials: {
                    accessKeyId,
                    secretAccessKey
                },
                region,
                endpoint: endpoint || undefined
            }

            this.#S3Client = new S3Client(clientConfig)
        } catch (error) {
            Logger.Error(`AmazonS3Storage Error: ${error}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#S3Client = undefined
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')
        Assert<string>(this.Params.bucket, this.Params?.bucket !== undefined, 'AmazonS3Storage: No bucket defined')
        Assert<S3Client>(this.#S3Client, this.#S3Client !== undefined, 'AmazonS3Storage: Connection to S3 not established')

        try {
            const command = new GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: file
            })

            await this.#S3Client.send(command)
            return true
        } catch (error: any) {
            // Only return false if it's a NoSuchKey error
            if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
                return false
            }
            // Throw for other errors
            throw error
        }
    }

    @Logger.LogFunction()
    async FileRead(file: string): Promise<Readable> {
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')
        Assert<string>(this.Params.bucket, this.Params?.bucket !== undefined, 'AmazonS3Storage: No bucket defined')
        Assert<S3Client>(this.#S3Client, this.#S3Client !== undefined, 'AmazonS3Storage: Connection to S3 not established')

        try {
            const command = new GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: file
            })

            const response = await this.#S3Client.send(command)

            if (!response.Body)
                throw new HttpErrorNotFound(`File '${file}' does not exist`)

            return ReadableUtils.FromReadableStream(response.Body as NodeJS.ReadableStream)
        } catch (error: any) {
            // Check if it's a NoSuchKey error and throw HttpErrorNotFound
            if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
                throw new HttpErrorNotFound(`File '${file}' does not exist`)
            }
            // For other errors, throw HttpErrorInternalServerError
            throw new HttpErrorInternalServerError(error.message)
        }
    }


    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        // Your existing assertions
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')
        Assert<string>(this.Params.bucket, this.Params?.bucket !== undefined, 'AmazonS3Storage: No bucket defined')
        Assert<S3Client>(this.#S3Client, this.#S3Client !== undefined, 'AmazonS3Storage: Connection to S3 not established')

        try {
            // 1. Get initial content type from extension
            let contentType = this.GetMimeType(file)

            // 2. Hybrid detection (first chunk + extension)
            const firstChunk = await new Promise<Buffer>((resolve, reject) => {
                content.once('data', (chunk) => {
                    resolve(Buffer.isBuffer(chunk)
                        ? chunk
                        : Buffer.from(chunk))
                    content.unshift(chunk) // Reinsert chunk for streaming
                })
                content.once('error', reject)
            })
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            Assert<Function>(FileTypeFromBuffer, FileTypeFromBuffer !== undefined, 'AmazonS3Storage: file-type module not loaded')
            
            // 3. Magic number detection
            const fileType = await FileTypeFromBuffer(firstChunk)
            if (fileType?.mime) {
                contentType = fileType.mime
            }

            // 4. Stream upload
            const command = new PutObjectCommand({
                Bucket: this.Params.bucket,
                Key: file,
                Body: content,
                ContentType: contentType
            })

            await this.#S3Client.send(command)
            Logger.Debug(`File '${file}' uploaded successfully`)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Error writing file: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async FileList(dir?: string): Promise<DataTable> {
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')
        Assert<string>(this.Params.bucket, this.Params?.bucket !== undefined, 'AmazonS3Storage: No bucket defined')
        Assert<S3Client>(this.#S3Client, this.#S3Client !== undefined, 'AmazonS3Storage: Connection to S3 not established')

        try {
            const prefix = dir
                ? `${dir.replace(/^\/+/, '').replace(/\/+$/, '')}/`
                : ''
    
            const command = new ListObjectsV2Command({
                Bucket: this.Params.bucket,
                Delimiter: '/',
                Prefix: prefix
            })
    
            const response = await this.#S3Client.send(command)
    
            if (!response.Contents) {
                return new DataTable(undefined)
            }
    
            const files = response.Contents
                .filter(file => file.Key && file.Key !== prefix) // Skip folder itself
                .filter(file => {
                    // Ensure it's a direct child, not nested
                    const relative = file.Key!.slice(prefix.length)
                    return !relative.includes('/')
                })
                .map(file => JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: file.Key?.split('/').pop() ?? file.Key ?? '',
                        mimeType: this.GetMimeType(file.Key),
                        type: DATA_ENTITY.FILE,
                        size: file?.Size,
                        modifiedAt: file?.LastModified,
                        path: file.Key
                    })
                )
    
            return new DataTable(undefined, files)
        } catch (error:unknown) {
            throw new HttpErrorInternalServerError(`Error listing files: ${(error as Error)?.message}`)
        }
    }

    @Logger.LogFunction()
    async FolderList(dir?: string): Promise<DataTable> {
        Assert<TAmazonS3StorageParams>(this.Params, this.Params !== undefined, 'AmazonS3Storage: No params defined')
        Assert<string>(this.Params.bucket, this.Params?.bucket !== undefined, 'AmazonS3Storage: No bucket defined')
        Assert<S3Client>(this.#S3Client, this.#S3Client !== undefined, 'AmazonS3Storage: Connection to S3 not established')

        const prefix = dir
            ? `${dir.replace(/^\/+/, '').replace(/\/+$/, '')}/`
            : ''

        const command = new ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Delimiter: '/',
            Prefix: prefix
        })

        const response = await this.#S3Client.send(command)

        if (!response.CommonPrefixes) {
            return new DataTable(undefined)
        }

        const folders = response.CommonPrefixes
            .filter(prefixObj => prefixObj.Prefix && prefixObj.Prefix !== prefix)
            .map(prefixObj => {
                const folderName = prefixObj.Prefix!.slice(prefix.length).replace(/\/$/, '')
                return JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: folderName,
                        type: DATA_ENTITY.FOLDER
                    }
                )
            })

        return new DataTable(undefined, folders)
    }
}
