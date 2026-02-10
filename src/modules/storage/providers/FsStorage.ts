//
//
//
import * as Fs from 'fs'
import { merge } from 'lodash-es'
import { Readable } from "node:stream"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from '../../../utils/Assert'
import { JsonUtils } from '../../../utils/JsonUtils'
import { Logger } from "../../../utils/Logger"
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { StringUtils } from '../../../utils/StringUtils'
import type { TConvertParams } from "../../../utils/TypeUtils"
import type { U_config_sources_source } from '../../core/types/U_config_sources'
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"
import type { TStorageFile, TStorageFolder } from '../@types'
import { absStorageProvider } from '../base/absStorageProvider'


//
export type U__source_storage_fs_options = {
    "fs-folder"?: string
    autocreate?: boolean
}

type TFsStorageParams = Required<{
    [K in keyof U__source_storage_fs_options as K extends `fs-${infer U}` ? TConvertParams<U> : K]: U__source_storage_fs_options[K]
}>


//
export class FsStorage extends absStorageProvider {
    ConfigSource?: U_config_sources_source
    ConfigStorage?: U__source_storage_file_options

    Params?: TFsStorageParams

    DEFAULT: TFsStorageParams = {
        folder: '',
        autocreate: false
    }

    @Logger.LogFunction()
    Init(): void {
        Assert.Var<U__source_storage_fs_options>(this.ConfigStorage, this.ConfigStorage !== undefined, 'No configuration defined')

        this.Params = merge(
            this.DEFAULT, {
            folder: this.ConfigStorage["fs-folder"],
            autocreate: this.ConfigStorage.autocreate
        })
    }


    @Logger.LogFunction()
    async Connect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage.Connect: Connected`)
    }


    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage: Disconnected`)
    }

    @Logger.LogFunction()
    async FolderIsExist(dirName: string): Promise<boolean> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        return Fs.existsSync(StringUtils.Path(this.Params.folder, dirName))
    }

    @Logger.LogFunction()
    async FolderCreate(dirName: string): Promise<void> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        const folderPath = StringUtils.Path(this.Params.folder, dirName)
        if (!Fs.existsSync(folderPath))
            Fs.mkdirSync(folderPath)
    }

    @Logger.LogFunction()
    async FolderListFiles(dirName?: string): Promise<DataTable> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')

        const dirPath = dirName
            ? StringUtils.Path(this.Params.folder, dirName)
            : this.Params.folder

        const result = await Fs.promises.readdir(dirPath, { withFileTypes: true })
            .then(files => files.filter(file => !file.isDirectory())
                .map(file => {
                    const fullPath = StringUtils.Path(file.parentPath, file.name)
                    const stats = Fs.statSync(fullPath)
                    return JsonUtils.RemoveUndefined(
                        <TStorageFile>{
                            name: file.name,
                            mimeType: this.GetMimeType(file.name),
                            type: DATA_ENTITY_TYPE.FILE,
                            size: stats.size,
                            createdAt: stats.birthtime,
                            modifiedAt: stats.mtime,
                            path: fullPath
                        })
                }))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params!.folder}': ${error.message}`)
            })

        return new DataTable(dirName, result)
    }

    @Logger.LogFunction()
    async FolderListFolders(): Promise<DataTable> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        Assert.Var<string>(this.Params.folder, this.Params.folder !== undefined, 'No folder defined')

        const folders = await Fs.promises.readdir(this.Params.folder, { withFileTypes: true })
            .then(folders => folders.filter(folder => folder.isDirectory())
                .map(folder => {
                    return JsonUtils.RemoveUndefined(
                        <TStorageFolder>{
                            name: folder.name,
                            type: DATA_ENTITY_TYPE.FOLDER
                        })
                }))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params!.folder}': ${error.message}`)
            })

        return new DataTable(undefined, folders)
    }

    @Logger.LogFunction()
    async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        return Fs.existsSync(StringUtils.Path(this.Params.folder, dirName, fileName))
    }

    @Logger.LogFunction()
    async FileRead(dirName: string, fileName: string): Promise<Readable> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')

        const fileFullPath = StringUtils.Path(this.Params.folder, dirName, fileName)

        if (this.Params.autocreate && !(await this.FileIsExist(dirName, fileName))) {
            const _fd = Fs.openSync(fileFullPath, 'wx')
            await Fs.promises.writeFile(fileFullPath, '', 'utf8')
            Fs.closeSync(_fd)
        }

        if (await this.FileIsExist(dirName, fileName))
            return ReadableUtils.FromReadStream(Fs.createReadStream(fileFullPath))

        throw new HttpErrorNotFound(`File '${fileName}' does not exist`)
    }

    @Logger.LogFunction(['content'])
    async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')

        const fileFullPath = StringUtils.Path(this.Params.folder, dirName, fileName)

        if (this.Params.autocreate && !(await this.FileIsExist(dirName, fileName))) {
            const _fd = Fs.openSync(fileFullPath, 'wx')
            await Fs.promises.writeFile(fileFullPath, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(fileFullPath, content, 'utf8')
    }

    @Logger.LogFunction()
    async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        const filePath = StringUtils.Path(this.Params.folder, dirName, oldFileName)
        if (Fs.existsSync(filePath))
            Fs.renameSync(filePath, StringUtils.Path(this.Params.folder, dirName, newFileName))
    }

    @Logger.LogFunction()
    async FileDelete(dirName: string, fileName: string): Promise<void> {
        Assert.Var<TFsStorageParams>(this.Params, 'No params defined')
        const filePath = StringUtils.Path(this.Params.folder, dirName, fileName)
        if (Fs.existsSync(filePath))
            Fs.unlinkSync(filePath)
    }
}
