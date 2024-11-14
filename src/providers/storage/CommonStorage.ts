//
//
//
//
//
//
import { Logger } from "../../utils/Logger"
import { TConfigSource } from "../../types/TConfig"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"


export class CommonStorage {

    ConfigSource: TConfigSource
    ConfigStorage: TFilesDataProviderOptions

    constructor(configSource: TConfigSource) {
        this.ConfigSource = configSource
        this.ConfigStorage = configSource.options as TFilesDataProviderOptions
        this.Init()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    Init(): void {
        Logger.Debug('Init')
    }
}