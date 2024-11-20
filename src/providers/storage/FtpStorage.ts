import { tags } from "typia"
import * as Ftp from "basic-ftp"
import { PassThrough, Readable } from "node:stream"
//
import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { TConvertParams } from "../../lib/TypeHelper"
import path from "node:path"

export type TFtpStorageConfig = {
    "ftp-host": string                                            // FTP server host
    "ftp-port"?: number & tags.Minimum<1> & tags.Maximum<65_535>  // FTP server port
    "ftp-user": string                                            // FTP server username
    "ftp-password": string                                        // FTP server password
    "ftp-secure"?: boolean                                        // Enable secure FTP connection (default: false)
    "ftp-folder"?: string                                         // Remote folder on the FTP server (default: '/')
}

type TFtpStorageParams = Required<{
    [K in keyof TFtpStorageConfig as K extends `ftp-${infer U}` ? TConvertParams<U> : K]: TFtpStorageConfig[K]
}>


export class FtpStorage extends CommonStorage implements IStorage {

    Params: TFtpStorageParams | undefined

    // FTP
    FtpClient: Ftp.Client = new Ftp.Client()

    @Logger.LogFunction()
    async Init(): Promise<void> {
        this.Params = <TFtpStorageParams>{
            host: this.ConfigStorage["ftp-host"],
            port: this.ConfigStorage["ftp-port"] ?? 21,
            user: this.ConfigStorage["ftp-user"],
            password: this.ConfigStorage["ftp-password"],
            secure: this.ConfigStorage["ftp-secure"] ?? false,
            folder: this.ConfigStorage["ftp-folder"] ?? '/'
        }
    }

    async Connect(): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FtpStorage: No params defined')

        try {
            await this.FtpClient.access({
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
    async IsExist(file: string): Promise<boolean> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FtpStorage: No params defined')

        try {
            const fileInfo = await this.FtpClient.size(
                path.join(this.Params.folder, file)
            )
            return fileInfo !== -1
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FtpStorage: No params defined')

        try {
            if (!(await this.IsExist(file)))
                throw new HttpErrorNotFound(`File '${file}' does not exist on the FTP server`)

            const content = new PassThrough()
            await this.FtpClient.downloadTo(
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

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FtpStorage: No params defined')

        const _path = path.join(this.Params.folder, file)
        try {
            if (this.ConfigStorage.autocreate && !(await this.IsExist(file)))
                await this.FtpClient.uploadFrom(content, _path)
            else
                await this.FtpClient.appendFrom(content, _path)

        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to write file '${file}' to FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FtpStorage: No params defined')

        try {
            const result = await this.FtpClient.list(this.Params.folder)
            const formattedResult = result
                .filter(file => !file.isDirectory)
                .map(file => ({
                    name: file.name,
                    type: 'file',
                    size: file.size
                }))

            return new DataTable(undefined, formattedResult)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Failed to list directory '${this.Params.folder}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.FtpClient.close()
    }
}
