//
//
//
//
import * as Ftp from "basic-ftp"
import { PassThrough, Readable } from "node:stream"
import path from "node:path"
import _ from "lodash"
//
import { Logger } from "../../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DataTable, TRow } from "../../../types/DataTable"
import { TConvertParams } from "../../../utils/TypeUtils"
import { absStorageProvider } from '../base/absStorageProvider'
import { TStorageFolder, TStorageFile } from '../@types'
import { TConfigSource } from "../../source/types/TConfigSource"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { TIpPort } from "../../../types/TIpPort"
import { StringUtils } from "../../../utils/StringUtils"
import { DATA_ENTITY } from "../../source/@consts"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Assert } from "../../../utils/Assert"


//
export type TFtpStorageConfig = {
    "ftp-host": string                    // FTP server host
    "ftp-port"?: TIpPort                  // FTP server port
    "ftp-user": string                    // FTP server username
    "ftp-password": string                // FTP server password
    "ftp-secure"?: boolean                // Enable secure FTP connection (default: false)
    "ftp-folder"?: string                 // Remote folder on the FTP server (default: '/')
}

type TFtpStorageParams = Required<{
    [K in keyof TFtpStorageConfig as K extends `ftp-${infer U}` ? TConvertParams<U> : K]: TFtpStorageConfig[K]
}>


//
export class FtpStorage extends absStorageProvider {

    ConfigSource?: TConfigSource
    ConfigStorage?: TFilesDataOptions

    Params?: TFtpStorageParams

    // FTP
    #FtpClient: Ftp.Client = new Ftp.Client()

    DEFAULT: TFtpStorageParams = {
        host: '',
        port: 21,
        user: '',
        password: '',
        secure: false,
        folder: '/'
    }

    @Logger.LogFunction()
    Init(): void {
        Assert<TFtpStorageParams>(this.ConfigStorage, this.ConfigStorage !== undefined, 'FtpStorage: No config storage defined')

        this.Params = _.merge(
            this.DEFAULT, <TFtpStorageParams>{
                host: this.ConfigStorage["ftp-host"],
                port: this.ConfigStorage["ftp-port"],
                user: this.ConfigStorage["ftp-user"],
                password: this.ConfigStorage["ftp-password"],
                secure: this.ConfigStorage["ftp-secure"],
                folder: this.ConfigStorage["ftp-folder"]
            }
        )
    }

    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

        try {
            await this.#FtpClient.access({
                host: this.Params.host,
                port: this.Params.port,
                user: this.Params.user,
                password: this.Params.password,
                secure: this.Params.secure
            })
        } catch (error: any) {
            Logger.Error(`Failed to connect to FTP server '${this.Params.host}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#FtpClient.close()
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

        try {
            const fileInfo = await this.#FtpClient.size(
                path.join(this.Params.folder, file)
            )
            return fileInfo !== -1
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async FileRead(file: string): Promise<Readable> {
        Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

        try {
            if (!(await this.FileIsExist(file)))
                throw new HttpErrorNotFound(`File '${file}' does not exist on the FTP server`)

            const content = new PassThrough()
            await this.#FtpClient.downloadTo(
                content,
                path.join(this.Params.folder, file)
            )
            return Readable.from(content)
        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to read file '${file}' from FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

        const _path = StringUtils.Url(this.Params.folder, file)
        try {
            if (this.ConfigStorage?.autocreate && !(await this.FileIsExist(file)))
                await this.#FtpClient.uploadFrom(content, _path)
            else
                await this.#FtpClient.appendFrom(content, _path)

        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to write file '${file}' to FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async FileList(dir?: string): Promise<DataTable> {
        try {
            Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

            const targetDir = dir
                ? path.join(this.Params.folder, dir)
                : this.Params.folder

            const list = await this.#FtpClient.list(targetDir)
            const result: TRow[] = list
                .filter(file => !file.isDirectory)
                .map(file => JsonUtils.RemoveUndefined(
                    <TStorageFile>{
                        name: file.name,
                        mimeType: this.GetMimeType(file.name),
                        type: DATA_ENTITY.FILE,
                        size: file.size,
                        createdAt: file.rawModifiedAt
                            ? new Date(file.rawModifiedAt)
                            : undefined,
                        modifiedAt: file.rawModifiedAt
                            ? new Date(file.rawModifiedAt)
                            : undefined,
                        path: path.join(targetDir, file.name)
                    }))
            return new DataTable(undefined, result)
        } catch (error: unknown) {
            throw new HttpErrorInternalServerError(`Failed to list files in FTP server: ${(error as Error).message}`)
        }
    }

    @Logger.LogFunction()
    async FolderList(dir: string = ""): Promise<DataTable> {
        Assert<TFtpStorageParams>(this.Params, this.Params !== undefined, 'FtpStorage: No params defined')

        const targetDir = dir
            ? path.join(this.Params.folder, dir)
            : this.Params.folder

        const list = await this.#FtpClient.list(targetDir)
        const result: TStorageFolder[] = list
            .filter(file => file.isDirectory)
            .map(file => JsonUtils.RemoveUndefined(
                <TStorageFolder>{
                    name: file.name,
                    type: DATA_ENTITY.FOLDER
                }
            ))
        return new DataTable(undefined, result)
    }
}
