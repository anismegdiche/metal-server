import * as Ftp from "basic-ftp"
import { PassThrough, Readable } from "node:stream"
//
import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"

export type TFtpStorageConfig = {
    "ftp-host": string                 // FTP server host
    "ftp-user": string                 // FTP server username
    "ftp-password": string             // FTP server password
    ftps?: boolean                     // Enable secure FTP connection (default: false)
    "ftp-remote-folder"?: string       // Remote folder on the FTP server (default: '/')
}

export class FtpStorage extends CommonStorage implements IStorage {

    Config = <TFtpStorageConfig>{}
    FtpClient: Ftp.Client = new Ftp.Client()

    @Logger.LogFunction()
    async Init(): Promise<void> {
        this.Config = {
            "ftp-host": this.Options["ftp-host"],
            "ftp-user": this.Options["ftp-user"],
            "ftp-password": this.Options["ftp-password"],
            ftps: this.Options.ftps ?? false,
            "ftp-remote-folder": this.Options["ftp-remote-folder"] ?? '/'
        }
    }

    async Connect(): Promise<void> {
        try {
            await this.FtpClient.access({
                host: this.Config["ftp-host"],
                user: this.Config["ftp-user"],
                password: this.Config["ftp-password"],
                secure: this.Config.ftps
            })
        } catch (error: any) {
            Logger.Error(`Failed to connect to FTP server '${this.Config["ftp-host"]}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        try {
            const path = `${this.Config["ftp-remote-folder"]}${file}`
            const fileInfo = await this.FtpClient.size(path)
            return fileInfo !== -1
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        const path = `${this.Config["ftp-remote-folder"]}${file}`
        try {
            if (!(await this.IsExist(file)))
                throw new HttpErrorNotFound(`File '${file}' does not exist on the FTP server`)

            const content = new PassThrough()
            await this.FtpClient.downloadTo(content, path)
            return Readable.from(content)
        } catch (error: any) {
            throw (error instanceof HttpErrorNotFound)
                ? error
                : new HttpErrorInternalServerError(`Failed to read file '${file}' from FTP server: ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        const path = `${this.Config["ftp-remote-folder"]}${file}`
        try {
            if (this.Options["autocreate"] && !(await this.IsExist(file))) {
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
            const result = await this.FtpClient.list(this.Config["ftp-remote-folder"])
            const formattedResult = result
                .filter(file => !file.isDirectory)
                .map(file => ({
                    name: file.name,
                    type: 'file',
                    size: file.size
                }))

            return new DataTable(undefined, formattedResult)
        } catch (error: any) {
            throw new HttpErrorInternalServerError(`Failed to list directory '${this.Config["ftp-remote-folder"]}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.FtpClient.close()
    }
}
