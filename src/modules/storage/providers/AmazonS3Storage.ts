//
//
//
// Lazy-loaded @aws-sdk/client-s3 module
import { loadEsm } from 'load-esm'
import merge from "lodash/merge"
import { Readable } from "node:stream"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from '../../../utils/Logger'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { StringUtils } from '../../../utils/StringUtils'
import { TConvertParams } from "../../../utils/TypeUtils"
import { DATA_ENTITY } from "../../source/@consts"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { TConfigSource } from "../../source/types/TConfigSource"
import { TStorageFile } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'


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
    Params?: TAmazonS3StorageParams

    private _s3Client: import('@aws-sdk/client-s3').S3Client | undefined
    private static _s3Module: typeof import('@aws-sdk/client-s3');

    DEFAULT = {}

    private static async _loadS3Module(): Promise<typeof import('@aws-sdk/client-s3')> {
        if (!this._s3Module) {
            this._s3Module = await import('@aws-sdk/client-s3');
        }
        return this._s3Module;
    }

    @Logger.LogFunction()
    Init(): void {
        Assert.Var<TAmazonS3StorageConfig>(this.ConfigStorage, 'AmazonS3Storage: No configuration defined')
        this.Params = merge(this.DEFAULT, <TAmazonS3StorageParams>{
            accessKeyId: this.ConfigStorage["s3-access-key-id"],
            secretAccessKey: this.ConfigStorage["s3-secret-access-key"],
            region: this.ConfigStorage["s3-region"],
            bucket: this.ConfigStorage["s3-bucket"],
            endpoint: this.ConfigStorage["s3-endpoint"]
        })
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')

        const { accessKeyId, secretAccessKey, region, bucket, endpoint } = this.Params

        try {
            if (!accessKeyId || !secretAccessKey || !region || !bucket) {
                Logger.Error('AmazonS3Storage: Missing required S3 configuration')
                this.Disconnect()
                return
            }

            const s3 = await AmazonS3Storage._loadS3Module();
            const clientConfig = {
                credentials: {
                    accessKeyId,
                    secretAccessKey
                },
                region,
                endpoint: endpoint || undefined
            }

            this._s3Client = new s3.S3Client(clientConfig)
        } catch (error) {
            Logger.Error(`AmazonS3Storage Error: ${error}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._s3Client = undefined
    }

    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();

        const command = new s3.ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Prefix: dirName.endsWith("/") ? dirName : dirName + "/", // ensure folder style prefix
            MaxKeys: 1
        });

        try {
            const response = await this._s3Client.send(command);
            return (response.Contents && response.Contents.length > 0) ?? false;
        } catch {
            return false;
        }

    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module()

        const command = new s3.PutObjectCommand({
            Bucket: this.Params.bucket,
            Key: dirName + "/",
            Body: '' // empty body to simulate folder
        })

        await this._s3Client.send(command)

    }

    @Logger.LogFunction()
    async FolderListFiles(dirName?: string): Promise<DataTable> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const prefix = dirName
            ? `${dirName.replace(/^\/+/, '').replace(/\/+$/, '')}/`
            : ''

        const command = new s3.ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Prefix: prefix,
            Delimiter: '/'
        })

        const response = await this._s3Client.send(command)

        if (!response.Contents) {
            return new DataTable(dirName)
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

        return new DataTable(dirName, files)
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const prefix = ''

        const command = new s3.ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Prefix: prefix,
            Delimiter: '/'
        })

        const response = await this._s3Client.send(command)

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

    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        try {
            const s3 = await AmazonS3Storage._loadS3Module();
            const command = new s3.GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: StringUtils.Path(dirName, fileName)
            })

            await this._s3Client.send(command)
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
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const command = new s3.GetObjectCommand({
            Bucket: this.Params.bucket,
            Key: StringUtils.Path(dirName, fileName)
        })

        const response = await this._s3Client.send(command)
        Assert.Var<NodeJS.ReadableStream>(response.Body, 'AmazonS3Storage: No body defined')

        return ReadableUtils.FromReadableStream(response.Body as NodeJS.ReadableStream)
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        // 1. Validate parameters and connection
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined');
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined');

        // 2. Load S3 module and validate client
        const s3Module = await AmazonS3Storage._loadS3Module();
        type S3Client = InstanceType<typeof s3Module.S3Client>;
        Assert.Var<S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established');

        // 3. Build S3 key with dirName
        const key = StringUtils.Path(dirName, fileName);

        // 4. Get initial content type from extension
        let contentType = this.GetMimeType(fileName);

        // 5. Hybrid detection (first chunk + extension)
        const firstChunk = await new Promise<Buffer>((resolve, reject) => {
            let resolved = false;

            const onData = (chunk: any) => {
                if (resolved) return;
                resolved = true;

                const bufferChunk = Buffer.isBuffer(chunk)
                    ? chunk
                    : Buffer.from(chunk);

                content.unshift(chunk); // Reinsert chunk for streaming
                cleanup();
                resolve(bufferChunk);
            };

            const onEnd = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(Buffer.alloc(0)); // Empty file case
            };

            const onError = (err: Error) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                reject(err);
            };

            const cleanup = () => {
                content.removeListener('data', onData);
                content.removeListener('end', onEnd);
                content.removeListener('error', onError);
            };

            content.once('data', onData);
            content.once('end', onEnd);
            content.once('error', onError);
        });

        // 6. Magic number detection
        if (!FileTypeFromBuffer) {
            throw new Error('AmazonS3Storage: file-type module not loaded');
        }

        const fileTypeFromBufferFn = await FileTypeFromBuffer;
        const fileType = fileTypeFromBufferFn
            ? await fileTypeFromBufferFn(firstChunk)
            : undefined;

        if (fileType?.mime) {
            contentType = fileType.mime;
        }

        // 7. Stream upload
        const command = new s3Module.PutObjectCommand({
            Bucket: this.Params.bucket,
            Key: key,
            Body: content,
            ContentType: contentType
        });

        await (this._s3Client as S3Client).send(command);
        Logger.Debug(`File '${key}' uploaded successfully`);
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module()

        const sourceKey = StringUtils.Path(dirName, oldFileName)
        const targetKey = StringUtils.Path(dirName, newFileName)

        await this._s3Client.send(new s3.CopyObjectCommand({
            Bucket: this.Params.bucket,
            CopySource: `${this.Params.bucket}/${sourceKey}`,
            Key: targetKey
        }))

        await this._s3Client.send(new s3.DeleteObjectCommand({
            Bucket: this.Params.bucket,
            Key: sourceKey
        }))

    }

    @Logger.LogFunction()
    async FileDelete(fileName: string): Promise<void> {
        Assert.Var<string>(fileName, 'File name is required')
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'AmazonS3Storage: No params defined')
        Assert.Var<string>(this.Params.bucket, 'AmazonS3Storage: No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'AmazonS3Storage: Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const command = new s3.DeleteObjectCommand({
            Bucket: this.Params.bucket,
            Key: fileName
        })

        await this._s3Client.send(command)
    }
}
