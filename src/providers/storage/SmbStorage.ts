//
//
//
//
//
import { Readable } from "node:stream"
import Smb2 from "smb2"
//
import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { ReadableHelper } from "../../lib/ReadableHelper"
import { TConvertParams } from "../../lib/TypeHelper"

export type TSmbStorageConfig = {
    "smb-share": string            // SMB share path, e.g., "\\server\share"
    "smb-domain"?: string          // SMB domain (optional)
    "smb-username": string         // SMB username
    "smb-password": string         // SMB password
    "smb-path"?: string            // Path within the share to operate in
}

type TSmbStorageParams = Required<{
    [K in keyof TSmbStorageConfig as K extends `smb-${infer U}` ? TConvertParams<U> : K]: TSmbStorageConfig[K]
}>

export class SmbStorage extends CommonStorage implements IStorage {

    Params: TSmbStorageParams | undefined

    // SMB
    #SmbClient: Smb2 | undefined

    #GetFilePath(file: string): string {
        if (!this.Params)
            throw new HttpErrorInternalServerError('SmbStorage: No params defined')

        return `${this.Params.path}/${file}`.replace(/\/+/g, "/")  // Ensure correct path format
    }

    @Logger.LogFunction()
    Init(): void {
        this.Params = <TSmbStorageParams>{
            share: this.ConfigStorage["smb-share"],
            domain: this.ConfigStorage["smb-domain"] ?? "",
            username: this.ConfigStorage["smb-username"],
            password: this.ConfigStorage["smb-password"],
            path: this.ConfigStorage["smb-path"] ?? ""
        }
    }

    async Connect(): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('SmbStorage: No params defined')

        try {
            // Initialize the SMB2 client
            this.#SmbClient = new Smb2(
                <Omit<TSmbStorageParams, "path">> this.Params
            )
        } catch (error: any) {
            Logger.Error(`Failed to connect to server '${this.Params.share}': ${error.message}`)
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

        if (!this.Params)
            throw new HttpErrorInternalServerError('SmbStorage: No params defined')

        try {
            const files = await new Promise<string[]>((resolve, reject) => {
                this.#SmbClient!.readdir(this.Params!.path, (err: any, files) => {
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