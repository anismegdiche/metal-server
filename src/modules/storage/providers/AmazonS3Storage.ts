
//
//
//
import { fileTypeFromBuffer } from 'file-type';
import { merge } from "lodash-es";
import { Readable } from "node:stream";
import z from 'zod';

//
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { DataTable } from "../../../types/DataTable";
import { Assert } from '../../../utils/Assert';
import { JsonUtils } from '../../../utils/JsonUtils';
import { Logger } from '../../../utils/Logger';
import { ReadableUtils } from '../../../utils/ReadableUtils';
import { StringUtils } from '../../../utils/StringUtils';
import type { TConvertParams } from "../../../utils/TypeUtils";
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from '../../errors/HttpErrors';
import { DATA_ENTITY_TYPE } from "../../source/@consts";
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData";
import type { TStorageFile } from '../@types';
import { absStorageProvider } from '../base/absStorageProvider';


//
const z_U__source_storage_s3_options = z.object({
    "bucket": z.string(),
    "region": z.string(),
    "access-key-id": z.string().optional(),
    "secret-access-key": z.string().optional(),
    "endpoint": z.string().optional(),
    "profile": z.string().optional(),
    autocreate: z.boolean().optional()
})

//
export type U__source_storage_s3_options = z.infer<typeof z_U__source_storage_s3_options>

type TAmazonS3StorageParams = Required<{
    [K in keyof U__source_storage_s3_options as K extends `${infer U}` ? TConvertParams<U> : K]: U__source_storage_s3_options[K]
}>


//
export class AmazonS3Storage extends absStorageProvider {

    Config?: U__source_storage_file_options
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

    IsConfigValid(): boolean {
        return z_U__source_storage_s3_options.safeParse(this.Config).success
    }

    @Logger.LogFunction()
    Init(): void {
        Assert.Var<U__source_storage_file_options>(this.Config, this.IsConfigValid(), 'No configuration defined')
        this.Config = merge(this.DEFAULT, this.Config)

        this.Params = <TAmazonS3StorageParams>{
            accessKeyId: this.Config["access-key-id"],
            secretAccessKey: this.Config["secret-access-key"],
            region: this.Config.region,
            bucket: this.Config.bucket,
            endpoint: this.Config.endpoint,
            profile: this.Config.profile,
            autocreate: this.Config.autocreate
        }
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')

        try {
            const { accessKeyId, secretAccessKey, region, bucket, endpoint } = this.Params

            if (!region || !bucket) {
                Logger.Error('AmazonS3Storage: Missing required S3 configuration (region and bucket are required)')
                this.Disconnect()
                return
            }

            const s3 = await AmazonS3Storage._loadS3Module();
            const clientConfig: S3ClientConfig = {
                region,
                endpoint: endpoint || undefined
            }

            // Flexible authentication methods
            if (accessKeyId && secretAccessKey) {
                // Use explicit credentials
                clientConfig.credentials = {
                    accessKeyId,
                    secretAccessKey
                }
            } else {
                // Use default credential chain (IAM roles, environment variables, etc.)
                // This will automatically pick up credentials from environment, IAM roles, or AWS config
            }

            this._s3Client = new s3.S3Client(clientConfig)

        } catch (e: unknown) {
            const _e = NormalizeError(e)
            throw new HttpErrorInternalServerError(`Amazon S3 Storage Error: ${_e.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this._s3Client = undefined
    }

    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        this.CheckPaths([dirName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();

        const command = new s3.ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Prefix: dirName.endsWith("/") ? dirName : dirName + "/", // ensure folder style prefix
            MaxKeys: 1
        });

        try {
            const response = await this._s3Client.send(command);
            // Check for folder existence in CommonPrefixes
            return (response.CommonPrefixes && response.CommonPrefixes.length > 0) ?? false;
        } catch {
            return false;
        }

    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        this.CheckPaths([dirName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

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
        this.CheckPaths([dirName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const prefix = dirName
            ? `${dirName.replace(/^\/+/g, '').replace(/\/+$/g, '')}/`
            : ''

        const command = new s3.ListObjectsV2Command({
            Bucket: this.Params.bucket,
            Prefix: prefix,
            Delimiter: '/'
        })

        const response = await this._s3Client.send(command)
            .catch(() => {
                throw new HttpErrorInternalServerError('AmazonS3Storage: Error listing folder')
            })

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
                    type: DATA_ENTITY_TYPE.FILE,
                    size: file?.Size,
                    modifiedAt: file?.LastModified,
                    path: file.Key
                })
            )

        return new DataTable(dirName, files)
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

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
                const folderName = prefixObj.Prefix!.slice(prefix.length).replace(/\/$/g, '')
                return JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: folderName,
                        type: DATA_ENTITY_TYPE.FOLDER
                    }
                )
            })

        return new DataTable(undefined, folders)
    }

    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

        try {
            const s3 = await AmazonS3Storage._loadS3Module();
            const command = new s3.GetObjectCommand({
                Bucket: this.Params.bucket,
                Key: StringUtils.Path(dirName, fileName)
            })

            await this._s3Client.send(command)
            return true
        } catch (err: unknown) {
            const _err = NormalizeError(err)
            // Only return false if it's a NoSuchKey error
            if (_err.type === 'NoSuchKey' || _err.name === 'NoSuchKey' || _err.code === 'NoSuchKey') {
                return false
            }
            // Throw for other errors
            throw err
        }
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const command = new s3.GetObjectCommand({
            Bucket: this.Params.bucket,
            Key: StringUtils.Path(dirName, fileName)
        })

        const response = await this._s3Client.send(command)
            .catch(() => {
                throw new HttpErrorNotFound('File not found')
            })

        Assert.Var<NodeJS.ReadableStream>(response.Body, 'No body defined')

        return ReadableUtils.FromReadableStream(response.Body as NodeJS.ReadableStream)
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        this.CheckPaths([dirName, fileName])

        // 1. Validate parameters and connection
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined');
        Assert.Var<string>(this.Params.bucket, 'No bucket defined');

        // 2. Load S3 module and validate client
        const s3Module = await AmazonS3Storage._loadS3Module();
        type S3Client = InstanceType<typeof s3Module.S3Client>;
        Assert.Var<S3Client>(this._s3Client, 'Connection to S3 not established');

        // 3. Build S3 key with dirName
        const key = StringUtils.Path(dirName, fileName);

        // 4. Get initial content type from extension
        let contentType = this.GetMimeType(fileName);

        // 5. Hybrid detection (first chunk + extension)
        const firstChunk = await new Promise<Buffer>((resolve, reject) => {
            let resolved = false;

            const onData = (chunk: Buffer | string) => {
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

        const fileType = await fileTypeFromBuffer(firstChunk)

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

        await this._s3Client.send(command);
        Logger.Debug(`File '${key}' uploaded successfully`);
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        this.CheckPaths([dirName, oldFileName, newFileName])

        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

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
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        this.CheckPaths([dirName, fileName])

        Assert.Var<string>(fileName, 'File name is required')
        Assert.Var<TAmazonS3StorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.bucket, 'No bucket defined')
        Assert.Var<import('@aws-sdk/client-s3').S3Client>(this._s3Client, 'Connection to S3 not established')

        const s3 = await AmazonS3Storage._loadS3Module();
        const command = new s3.DeleteObjectCommand({
            Bucket: this.Params.bucket,
            Key: StringUtils.Path(dirName, fileName)
        })

        await this._s3Client.send(command)
    }
}
