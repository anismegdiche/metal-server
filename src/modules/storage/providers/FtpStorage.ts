//
// FTP Storage
import * as Ftp from "basic-ftp"
import { merge } from "lodash-es"
import { PassThrough, Readable } from "node:stream"
//
import { DataTable, type TRow } from "../../../types/DataTable"
import type { TIpPort } from "../../../types/TIpPort"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { StringUtils } from "../../../utils/StringUtils"
import type { TConvertParams } from "../../../utils/TypeUtils"
import type { U_config_sources_source } from "../../core/types/U_config_sources"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { TStorageFilesDataOptions } from "../../source/types/TStorageFilesDataOptions"
import type { TStorageFile, TStorageFolder } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'

//
export type TFtpStorageConfig = {
    "ftp-host": string
    "ftp-port"?: TIpPort
    "ftp-user": string
    "ftp-password": string
    "ftp-secure"?: boolean
    "ftp-folder"?: string
}

type TFtpStorageParams = Required<{
    [K in keyof TFtpStorageConfig as K extends `ftp-${infer U}` ? TConvertParams<U> : K]: TFtpStorageConfig[K]
}>

//
export class FtpStorage extends absStorageProvider {

    ConfigSource?: U_config_sources_source
    ConfigStorage?: TStorageFilesDataOptions
    Params?: TFtpStorageParams

    #FtpClient: Ftp.Client = new Ftp.Client()

    DEFAULT: TFtpStorageParams = {
        host: '',
        port: 21,
        user: '',
        password: '',
        secure: false,
        folder: '/'
    }

    // -----------------------------
    // Init
    // -----------------------------
    @Logger.LogFunction()
    Init(): void {
        Assert.Var<TFtpStorageParams>(this.ConfigStorage, 'FtpStorage: No config storage defined')

        this.Params = merge(this.DEFAULT, <TFtpStorageParams>{
            host: this.ConfigStorage["ftp-host"],
            port: this.ConfigStorage["ftp-port"],
            user: this.ConfigStorage["ftp-user"],
            password: this.ConfigStorage["ftp-password"],
            secure: this.ConfigStorage["ftp-secure"],
            folder: this.ConfigStorage["ftp-folder"]
        })
    }

    // -----------------------------
    // Connect / Disconnect
    // -----------------------------
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        try {
            await this.#FtpClient.access({
                host: this.Params.host,
                port: this.Params.port,
                user: this.Params.user,
                password: this.Params.password,
                secure: this.Params.secure
            })
        } catch (error: unknown) {
            Logger.Error(`Failed to connect to FTP server '${this.Params.host}': ${(error as Error)?.message}`)
        }
    }

    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        this.#FtpClient.close()
    }

    // -----------------------------
    // Folder Operations
    // -----------------------------
    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        try {
            const fullPath = StringUtils.Path(this.Params.folder, dirName)
            await this.#FtpClient.ensureDir(fullPath)
            return true
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        const fullPath = StringUtils.Path(this.Params.folder, dirName)
        await this.#FtpClient.ensureDir(fullPath)
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')
        Assert.Var<string>(this.Params.folder, 'FtpStorage: No folder defined')

        const list = await this.#FtpClient.list(this.Params.folder)
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to list folders: ${(error as Error)?.message}`)
            })

        const folders: TStorageFolder[] = list
            .filter(file => file.isDirectory)
            .map(file => JsonUtils.RemoveUndefined(<TStorageFolder>{
                name: file.name,
                type: DATA_ENTITY_TYPE.FOLDER
            }))

        return new DataTable(undefined, folders)
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName?: string): Promise<DataTable> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        const targetDir = dirName ? StringUtils.Path(this.Params.folder, dirName) : this.Params.folder
        const list = await this.#FtpClient.list(targetDir)
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to list files: ${(error as Error)?.message}`)
            })

        const result: TRow[] = list
            .filter(file => !file.isDirectory)
            .map(file => JsonUtils.RemoveUndefined(<TStorageFile>{
                name: file.name,
                mimeType: this.GetMimeType(file.name),
                type: DATA_ENTITY_TYPE.FILE,
                size: file.size,
                createdAt: file.rawModifiedAt ? new Date(file.rawModifiedAt) : undefined,
                modifiedAt: file.rawModifiedAt ? new Date(file.rawModifiedAt) : undefined,
                path: StringUtils.Path(targetDir, file.name)
            }))

        return new DataTable(dirName, result)
    }

    // -----------------------------
    // File Operations
    // -----------------------------
    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        try {
            const fileInfo = await this.#FtpClient.size(StringUtils.Path(this.Params.folder, dirName, fileName))
            return fileInfo !== -1
        } catch {
            return false
        }
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        if (!(await this.FileIsExist(dirName, fileName)))
            throw new HttpErrorNotFound(`File '${fileName}' does not exist on the FTP server`)

        const content = new PassThrough()
        await this.#FtpClient.downloadTo(content, StringUtils.Path(this.Params.folder, dirName, fileName))
        return Readable.from(content)
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        const fullPath = StringUtils.Path(this.Params.folder, dirName, fileName)
        if (this.ConfigStorage?.autocreate && !(await this.FileIsExist(dirName, fileName)))
            await this.#FtpClient.uploadFrom(content, fullPath)
        else
            await this.#FtpClient.appendFrom(content, fullPath)
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, fileName: string, newName: string): Promise<void> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')

        try {
            const oldPath = StringUtils.Path(this.Params.folder, dirName, fileName)
            const newPath = StringUtils.Path(this.Params.folder, dirName, newName)

            if (!(await this.FileIsExist(dirName, fileName))) {
                throw new HttpErrorNotFound(`File '${fileName}' does not exist on the FTP server`)
            }

            await this.#FtpClient.rename(oldPath, newPath)
        } catch (error) {
            if (error instanceof HttpErrorNotFound) {
                throw error
            }
            throw new HttpErrorInternalServerError(`Failed to rename file from '${fileName}' to '${newName}': ${String(error)}`)
        }
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        Assert.Var<TFtpStorageParams>(this.Params, 'FtpStorage: No params defined')
        Assert.Var<string>(fileName, 'File name is required')

        await this.#FtpClient.remove(StringUtils.Path(this.Params.folder, dirName, fileName))
    }
}
