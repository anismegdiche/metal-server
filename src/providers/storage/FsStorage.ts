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

export type TFsStorageConfig = {
    fsFolder?: string
}

export class FsStorage extends CommonStorage implements IStorage {

    Config = <TFsStorageConfig>{}

    @Logger.LogFunction()
    Init(): void {
        this.Config = {
            fsFolder: this.Options.fsFolder ?? '.'
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Connect(): Promise<void> {
        Logger.Debug(`Connected`)
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    async Disconnect(): Promise<void> {
        Logger.Debug(`Disconnected`)
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        return Fs.existsSync(`${this.Config.fsFolder}${file}`)
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<Readable> {

        const filePath = this.Config.fsFolder + file

        if (this.Options.autoCreate && !(await this.IsExist(file))) {
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

        const filePath = this.Config.fsFolder + file

        if (this.Options.autoCreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(filePath, content, 'utf8')
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        // TODO: fix workaround:  this.Config.fsFolder ?? '.'
        const result = await Fs.promises.readdir(this.Config.fsFolder ?? '.')
            .then(files => Promise.all(files.map(async file => {
                const stats = await Fs.promises.stat(`${this.Config.fsFolder}${file}`)
                return {
                    name: file,
                    type: 'file',
                    size: stats.size
                }
            })))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read directory '${this.Config.fsFolder}': ${error.message}`)
            })

        return new DataTable(undefined, result)
    }
}
