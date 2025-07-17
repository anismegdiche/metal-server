//
//
//
import * as Fs from 'fs'
import { Readable } from "node:stream"
import _ from 'lodash'
import path from 'node:path'
//
import { Logger } from "../../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { TConvertParams } from "../../../utils/TypeUtils"
import { absStorageProvider } from '../base/absStorageProvider'
import { TStorageFolder , TStorageFile } from '../@types'
import { TConfigSource } from "../../source/types/TConfigSource"
import { TFilesDataOptions } from "../../source/providers/TFilesDataOptions"
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { DATA_ENTITY } from "../../source/@consts"
import { JsonUtils } from '../../../utils/JsonUtils'
import { Assert } from '../../../utils/Assert'


//
export type TFsStorageConfig = {
    "fs-folder"?: string
    autocreate?: boolean
}

type TFsStorageParams = Required<{
    [K in keyof TFsStorageConfig as K extends `fs-${infer U}` ? TConvertParams<U> : K]: TFsStorageConfig[K]
}>


//
export class FsStorage extends absStorageProvider {
    ConfigSource?: TConfigSource | undefined
    ConfigStorage?: TFilesDataOptions | undefined

    Params: TFsStorageParams | undefined

    DEFAULT: TFsStorageParams = {
        folder: '',
        autocreate: false
    }

    @Logger.LogFunction()
    Init(): void {
        Assert<TFsStorageConfig>(this.ConfigStorage, this.ConfigStorage !== undefined, 'FsStorage: No configuration defined')

        this.Params = _.merge(
            this.DEFAULT, {
            folder: this.ConfigStorage["fs-folder"],
            autocreate: this.ConfigStorage.autocreate
        })
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage: Connected`)
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage: Disconnected`)
    }

    @Logger.LogFunction()
    async FileIsExist(file: string): Promise<boolean> {
        Assert<TFsStorageParams>(this.Params, this.Params !== undefined, 'FsStorage: No params defined')

        return Fs.existsSync(`${this.Params.folder}${file}`)
    }

    @Logger.LogFunction()
    async FileRead(file: string): Promise<Readable> {
        Assert<TFsStorageParams>(this.Params, this.Params !== undefined, 'FsStorage: No params defined')

        const filePath = this.Params.folder + file

        if (this.Params.autocreate && !(await this.FileIsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }

        if (await this.FileIsExist(file))
            return ReadableUtils.FromReadStream(Fs.createReadStream(filePath))

        throw new HttpErrorNotFound(`File '${file}' does not exist`)
    }

    @Logger.LogFunction(['content'])
    async FileWrite(file: string, content: Readable): Promise<void> {
        Assert<TFsStorageParams>(this.Params, this.Params !== undefined, 'FsStorage: No params defined')

        const filePath = this.Params.folder + file

        if (this.Params.autocreate && !(await this.FileIsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(filePath, content, 'utf8')
    }

    @Logger.LogFunction()
    async FileList(dir?: string): Promise<DataTable> {
        Assert<TFsStorageParams>(this.Params, this.Params !== undefined, 'FsStorage: No params defined')

        const dirPath = dir
            ? path.join(this.Params.folder, dir)
            : this.Params.folder

        const result = await Fs.promises.readdir(dirPath, { withFileTypes: true })
            .then(files => files.filter(file => !file.isDirectory())
                .map(file => {
                    const fullPath = path.join(dirPath, file.name)
                    const relativePath = path.relative(dir!, fullPath)
                    const stats = Fs.statSync(fullPath)
                    return JsonUtils.RemoveUndefined(
                        <TStorageFile>{
                            name: file.name,
                            mimeType: this.GetMimeType(file.name),
                            type: DATA_ENTITY.FILE,
                            size: stats.size,
                            createdAt: stats.birthtime,
                            modifiedAt: stats.mtime,
                            path: relativePath
                        })
                }))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params!.folder}': ${error.message}`)
            })

        return new DataTable(undefined, result)
    }

    @Logger.LogFunction()
    async FolderList(): Promise<DataTable> {
        Assert<TFsStorageParams>(this.Params, this.Params !== undefined, 'FsStorage: No params defined')
        Assert<string>(this.Params.folder, this.Params.folder !== undefined, 'FsStorage: No folder defined')

        const result = await Fs.promises.readdir(this.Params.folder, { withFileTypes: true })
            .then(folders => folders.filter(folder => folder.isDirectory())
                .map(folder => {
                    return JsonUtils.RemoveUndefined(
                        <TStorageFolder>{
                            name: folder.name,
                            type: DATA_ENTITY.FOLDER
                        })
                }))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params!.folder}': ${error.message}`)
            })

        return new DataTable(undefined, result)
    }
}
