//
//
//
//
//
import { Readable } from "node:stream"
//
import { Logger } from "../../utils/Logger"
import { TConfigSource } from "../../types/TConfig"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"
import { HttpErrorNotImplemented } from "../../server/HttpErrors"
import { DataTable } from "../../types/DataTable"
import { ReadStream } from "fs"


export class CommonStorage {

    Params: TConfigSource
    Options: TFilesDataProviderOptions

    constructor(storageParams: TConfigSource) {
        this.Params = storageParams
        this.Options = storageParams.options as TFilesDataProviderOptions
        this.Init()
    }

    // eslint-disable-next-line class-methods-use-this
    @Logger.LogFunction()
    Init(): void {
        Logger.Debug('Init')
    }
}