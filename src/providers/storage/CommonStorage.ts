//
//
//
//
//
//
import { Logger } from "../../utils/Logger"
import { TConfigSource } from "../../types/TConfig"
import { TFilesDataOptions } from "../data/FilesData"


export class CommonStorage {

    ConfigSource: TConfigSource
    ConfigStorage: TFilesDataOptions

    constructor(configSource: TConfigSource) {
        this.ConfigSource = configSource
        this.ConfigStorage = configSource.options as TFilesDataOptions
        this.Init()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    Init(): void {
        Logger.Debug('Init')
    }
}