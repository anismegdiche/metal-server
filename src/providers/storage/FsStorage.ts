//
//
//
//
//
import * as Fs from 'fs'
import { Readable } from "node:stream"
//
import { CommonStorage } from "./CommonStorage"
import { IStorage } from "../../types/IStorage"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { Convert } from "../../lib/Convert"
import { TConvertParams } from "../../lib/TypeHelper"

export type TFsStorageConfig = {
    "fs-folder"?: string
    autocreate?: boolean
}

type TFsStorageParams = Required<{
    [K in keyof TFsStorageConfig as K extends `fs-${infer U}` ? TConvertParams<U> : K]: TFsStorageConfig[K]
}>


export class FsStorage extends CommonStorage implements IStorage {

    Params: TFsStorageParams | undefined

    @Logger.LogFunction()
    Init(): void {
        this.Params = <TFsStorageParams>{
            folder: this.ConfigStorage["fs-folder"] ?? '',
            autocreate: this.ConfigStorage.autocreate ?? false
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Connect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage: Connected`)
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`${Logger.Out} FsStorage: Disconnected`)
    } 

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FsStorage: No params defined')

        return Fs.existsSync(`${this.Params.folder}${file}`)
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FsStorage: No params defined')

        const filePath = this.Params.folder + file

        if (this.Params.autocreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }

        if (await this.IsExist(file))
            return Convert.ReadStreamToReadable(Fs.createReadStream(filePath))

        throw new HttpErrorNotFound(`File '${file}' does not exist`)
    }

    @Logger.LogFunction()
    async Write(file: string, content: Readable): Promise<void> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FsStorage: No params defined')

        const filePath = this.Params.folder + file

        if (this.Params.autocreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(filePath, content, 'utf8')
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        if (!this.Params)
            throw new HttpErrorInternalServerError('FsStorage: No params defined')

        const result = await Fs.promises.readdir(this.Params.folder)
            .then(files => Promise.all(files.map(async file => {
                const stats = await Fs.promises.stat(`${this.Params!.folder}${file}`)
                return {
                    name: file,
                    type: 'file',
                    size: stats.size
                }
            })))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read directory '${this.Params!.folder}': ${error.message}`)
            })

        return new DataTable(undefined, result)
    }
}
