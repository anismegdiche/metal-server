//
//
//
//
//
import * as Fs from 'fs'
//
import { CommonStorage, IStorage } from "./CommonStorage"


export class FsStorage extends CommonStorage implements IStorage {

    async IsExist(file: string): Promise<boolean> {
        return Fs.existsSync(`${this.Options.filesPath}${file}`)
    }

    async Read(file: string): Promise<string | undefined> {
        if (await this.IsExist(file)) {
            return Fs.promises.readFile(`${this.Options.filesPath}${file}`, 'utf8')
        }
        return undefined
    }

    async Write(file: string, content: string): Promise<void> {
        await Fs.promises.writeFile(`${this.Options.filesPath}${file}`, content, 'utf8')
    }
}
