import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { Readable } from "node:stream"
import * as Ftp from "basic-ftp"
import { ReadableHelper } from "../../lib/ReadableHelper"

export type TFtpStorageConfig = {
    ftpHost: string
    ftpUser: string
    ftpPassword: string
    ftpSecure?: boolean
    ftpRemoteFolder?: string
}

export class FtpStorage extends CommonStorage implements IStorage {

    Config = <TFtpStorageConfig>{}
    FtpClient: Ftp.Client = new Ftp.Client()

    @Logger.LogFunction()
    async Init(): Promise<void> {
        this.Config = {
            ftpHost: this.Options.ftpHost,
            ftpUser: this.Options.ftpUser,
            ftpPassword: this.Options.ftpPassword,
            ftpSecure: this.Options.ftpSecure ?? false,
            ftpRemoteFolder: this.Options.ftpRemoteFolder ?? '/'
        }
    }

    async Connect(): Promise<void> {
        try {
            await this.FtpClient.access({
                host: this.Config.ftpHost,
                user: this.Config.ftpUser,
                password: this.Config.ftpPassword,
                secure: this.Config.ftpSecure
            })
        } catch (error: any) {
            Logger.Error(`Failed to connect to FTP server '${this.Config.ftpHost}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        try {
            const path = `${this.Config.ftpRemoteFolder}${file}`
            const fileInfo = await this.FtpClient.size(path)
            return fileInfo !== -1
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        const path = `${this.Config.ftpRemoteFolder}${file}`
        try {
            if (!(await this.IsExist(file)))
                throw new HttpErrorNotFound(`File '${file}' does not exist on the FTP server`)

            const stream = new Readable()
            await this.FtpClient.downloadTo(ReadableHelper.ToWritable(stream), path)
            return stream
        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to read file '${file}' from FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        const path = `${this.Config.ftpRemoteFolder}${file}`
        try {
            if (this.Options.autoCreate && !(await this.IsExist(file))) {
                await this.FtpClient.uploadFrom(content, path)
            } else {
                await this.FtpClient.appendFrom(content, path)
            }
        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to write file '${file}' to FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        try {
            const result = await this.FtpClient.list(this.Config.ftpRemoteFolder)
            const formattedResult = result
                .filter(file => !file.isDirectory)
                .map(file => ({
                    name: file.name,
                    type: 'file',
                    size: file.size
                }))

            return new DataTable(undefined, formattedResult)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Failed to list directory '${this.Config.ftpRemoteFolder}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.FtpClient.close()
    }
}
