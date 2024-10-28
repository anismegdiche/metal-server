import { Readable } from "node:stream"
import Smb2 from "smb2"
//
import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { ReadableHelper } from "../../lib/ReadableHelper"

export type TSmbStorageConfig = {
    smbShare: string            // SMB share path, e.g., "\\server\share"
    smbDomain?: string          // SMB domain (optional)
    smbUsername: string         // SMB username
    smbPassword: string         // SMB password
    smbPath?: string            // Path within the share to operate in
}

export class SmbStorage extends CommonStorage implements IStorage {
    Config = <Required<TSmbStorageConfig>>{}
    #SmbClient: Smb2 | undefined

    #GetFilePath(file: string): string {
        return `${this.Config.smbPath}/${file}`.replace(/\/+/g, "/")  // Ensure correct path format
    }

    @Logger.LogFunction()
    Init(): void {
        this.Config = <Required<TSmbStorageConfig>>{
            smbShare: this.Options.smbShare,
            smbDomain: this.Options.smbDomain ?? "",
            smbUsername: this.Options.smbUsername,
            smbPassword: this.Options.smbPassword,
            smbPath: this.Options.smbPath ?? ""
        }
    }

    async Connect(): Promise<void> {
        try {
            // Initialize the SMB2 client
            this.#SmbClient = new Smb2({
                share: this.Config.smbShare,
                domain: this.Config.smbDomain,
                username: this.Config.smbUsername,
                password: this.Config.smbPassword
            })
        } catch (error: any) {
            Logger.Error(`Failed to connect to FTP server '${this.Config.smbDomain}': ${error.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        if (this.#SmbClient) {
            await new Promise<void>((resolve) => {
                this.#SmbClient!.close()
                resolve()
            })
            this.#SmbClient = undefined
        }
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        if (this.#SmbClient === undefined) {
            throw new HttpErrorInternalServerError("SMB client not initialized")
        }

        const filePath = this.#GetFilePath(file)

        try {
            return await new Promise<boolean>((resolve, reject) => {
                this.#SmbClient!.exists(filePath, (err, exists) => {
                    if (err) {
                        reject(err)
                        return
                    }
                    resolve(exists)
                })
            })
        } catch (error) {
            return false
        }
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        if (this.#SmbClient === undefined) {
            throw new HttpErrorInternalServerError('SMB client not initialized')
        }

        if (!(await this.IsExist(file))) {
            throw new HttpErrorNotFound(`File '${file}' does not exist on the SMB server`)
        }

        const filePath = this.#GetFilePath(file)

        return new Promise<Readable>((resolve, reject) => {
            this.#SmbClient!.readFile(filePath, (err: any, dataString) => {
                if (err) {
                    reject(new HttpErrorInternalServerError(`Failed to read file '${file}': ${err.message}`))
                    return
                }
                resolve(Readable.from(dataString))
            })
        })
    }

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (this.#SmbClient === undefined) {
            throw new HttpErrorInternalServerError('SMB client not initialized')
        }

        const filePath = this.#GetFilePath(file)

        try {
            const contentString = await ReadableHelper.ToString(content)

            return new Promise<void>((resolve, reject) => {
                this.#SmbClient!.writeFile(filePath, contentString, (err: any) => {
                    if (err) {
                        reject(new HttpErrorInternalServerError(`Failed to write file '${file}': ${err.message}`))
                        return
                    }
                    resolve()
                })
            })
        } catch (error: any) {
            throw new HttpErrorInternalServerError(
                `Failed to process content for file '${file}': ${error instanceof Error
                    ? error.message
                    : 'Unknown error'}`
            )
        }
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        if (this.#SmbClient === undefined) {
            throw new HttpErrorInternalServerError('SMB client not initialized')
        }

        const { smbPath } = this.Config

        try {
            const files = await new Promise<string[]>((resolve, reject) => {
                this.#SmbClient!.readdir(smbPath, (err: any, files) => {
                    if (err) {
                        reject(new HttpErrorInternalServerError(`Failed to list files: ${err.message}`))
                        return
                    }
                    resolve(files)
                })
            })

            return new DataTable("", files.map((file: string) => ({
                name: file,
                type: "file"
            })))
        } catch (error) {
            throw error instanceof Error
                ? error
                : new HttpErrorInternalServerError('Unknown error during file listing')
        }
    }
}