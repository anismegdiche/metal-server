//
//
//
//
//
import * as Fs from 'fs'
//
import { CommonStorage, IStorage } from "./CommonStorage"

type TFsStorageConfig = {
    folder: string
}

export class FsStorage extends CommonStorage implements IStorage {

    Config = <TFsStorageConfig>{}

    Init(): void {
        this.Config = {
            folder: this.Options.fsFolder ?? '.'
        }
    }

    async IsExist(file: string): Promise<boolean> {
        return Fs.existsSync(`${this.Config.folder}${file}`)
    }

    async Read(file: string): Promise<string | undefined> {
        if (this.Options.autoCreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(`${this.Config.folder}${file}`, 'wx')
            await Fs.promises.writeFile(`${this.Config.folder}${file}`, '', 'utf8')
            Fs.closeSync(_fd)
        }
        if (await this.IsExist(file)) {
            return Fs.promises.readFile(`${this.Config.folder}${file}`, 'utf8')
        }
        return undefined
    }

    async Write(file: string, content: string): Promise<void> {
        if (this.Options.autoCreate && !(await this.IsExist(file))) {
            const _fd = Fs.openSync(`${this.Config.folder}${file}`, 'wx')
            await Fs.promises.writeFile(`${this.Config.folder}${file}`, '', 'utf8')
            Fs.closeSync(_fd)
        }
        await Fs.promises.writeFile(`${this.Config.folder}${file}`, content, 'utf8')
    }
}
