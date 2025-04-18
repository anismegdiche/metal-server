//
//
//
//
//
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { Readable } from "node:stream"
//
import { Logger } from '../../utils/Logger'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { TJson } from "../../types/TJson"
import { DataTable } from "../../types/DataTable"
import { TConvertParams } from "../../lib/TypeHelper"
import { absStorageProvider } from '../absStorageProvider'
import { TConfigSource } from "../../types/TConfig"
import { TFilesDataOptions } from "../data/FilesData"


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

export class AmazonS3Storage extends absStorageProvider {
    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params: TAmazonS3StorageParams | undefined

    #s3Client: S3Client | undefined

    @Logger.LogFunction()
    Init(): void {
        Logger.Debug("AmazonS3Storage.Init")
        if (!this.ConfigStorage)
            throw new HttpErrorInternalServerError('AmazonS3Storage: No configuration defined')

        // Extract configuration values with type assertion
        const config = this.ConfigStorage as TFilesDataOptions & TAmazonS3StorageConfig
        this.Params = <TAmazonS3StorageParams>{
            accessKeyId: config["s3-access-key-id"],
            secretAccessKey: config["s3-secret-access-key"],
            region: config["s3-region"],
            bucket: config["s3-bucket"],
            endpoint: config["s3-endpoint"]
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('AmazonS3Storage: No params defined')

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

            this.#s3Client = new S3Client(clientConfig)
        } catch (error) {
            Logger.Error(`AmazonS3Storage Error: ${error}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#s3Client = undefined
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        if (!this.#s3Client || !this.Params?.bucket) {
            throw new HttpErrorInternalServerError('AmazonS3Storage: Connection to S3 not established')
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: file
            })

            await this.#s3Client.send(command)
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
    async Read(file: string): Promise<Readable> {
        if (!this.#s3Client || !this.Params?.bucket) {
            throw new HttpErrorInternalServerError('AmazonS3Storage: Connection to S3 not established')
        }

        try {
            const command = new GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: file
            })

            const response = await this.#s3Client.send(command)
            if (!response.Body) {
                throw new HttpErrorNotFound(`File '${file}' does not exist`)
            }

            // Convert S3 stream to Node.js Readable stream
            const readable = new Readable()
            readable._read = () => {}
            
            // Use the proper AWS SDK v3 stream handling
            const stream = response.Body as NodeJS.ReadableStream;
            stream.on('data', (chunk) => {
                readable.push(chunk)
            })
            
            stream.on('end', () => {
                readable.push(null)
            })

            return readable
        } catch (error: any) {
            // Check if it's a NoSuchKey error and throw HttpErrorNotFound
            if (error.name === 'NoSuchKey' || error.code === 'NoSuchKey') {
                throw new HttpErrorNotFound(`File '${file}' does not exist`)
            }
            // For other errors, throw HttpErrorInternalServerError
            throw new HttpErrorInternalServerError(error.message)
        }
    }
    

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (!this.#s3Client || !this.Params?.bucket) {
            throw new HttpErrorInternalServerError('AmazonS3Storage: Connection to S3 not established');
        }
    
        try {
            const contentType = 'application/octet-stream'; // or dynamically detect content type
    
            const command = new PutObjectCommand({
                Bucket: this.Params.bucket,
                Key: file,
                Body: content,
                ContentType: contentType // Add ContentType here
            });
    
            await this.#s3Client.send(command);
            Logger.Debug(`File '${file}' uploaded successfully`);
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Error writing file: ${error.message}`);
        }
    }
    

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        if (!this.#s3Client || !this.Params?.bucket) {
            throw new HttpErrorInternalServerError('AmazonS3Storage: Connection to S3 not established')
        }

        try {
            const command = new ListObjectsV2Command({
                Bucket: this.Params.bucket
            })

            const response = await this.#s3Client.send(command)
            if (!response.Contents) {
                return new DataTable(undefined, [])
            }

            const result: TJson[] = response.Contents.map(item => ({
                name: item.Key || '',
                type: 'file',
                size: item.Size || 0
            }))

            return new DataTable(undefined, result)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(error.message)
        }
    }
}
