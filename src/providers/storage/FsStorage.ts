//
//
//
//
//
import * as Fs from 'fs'
//
import { CommonStorage } from "./CommonStorage"
import { IStorageProvider } from "../../types/IStorageProvider"
import { Logger } from "../../utils/Logger"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"

type TFsStorageConfig = {
    folder: string
}

export class FsStorage extends CommonStorage implements IStorageProvider {

    Config = <TFsStorageConfig>{}

    @Logger.LogFunction()
    Init(): void {
        this.Config = {
            folder: this.Options.fsFolder ?? '.'
        }
    }

    @Logger.LogFunction()
    async IsExist(file: string): Promise<boolean> {
        return Fs.existsSync(`${this.Config.folder}${file}`)
    }

    @Logger.LogFunction()
    async Read(file: string): Promise<string> {

        const filePath = this.Config.folder + file

        if (this.Options.autoCreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }

        if (await this.IsExist(file))
            return Fs.promises.readFile(filePath, 'utf8')

        throw new HttpErrorNotFound(`File '${file}' does not exist`)
    }

    @Logger.LogFunction()
    async Write(file: string, content: string): Promise<void> {

        const filePath = this.Config.folder + file

        if (this.Options.autoCreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(filePath, 'wx')
            await Fs.promises.writeFile(filePath, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(filePath, content, 'utf8')
    }

    @Logger.LogFunction()
    async List(): Promise<DataTable> {
        const result = await Fs.promises.readdir(this.Config.folder)
            .then(files => Promise.all(files.map(async file => {
                const stats = await Fs.promises.stat(`${this.Config.folder}${file}`)
                return {
                    name: file,
                    type: 'file',
                    size: stats.size
                }
            })))
            .catch((error) => {
                throw new HttpErrorInternalServerError(`Failed to read directory '${this.Config.folder}': ${error.message}`)
            })

        return new DataTable(undefined, result)
    }
}
