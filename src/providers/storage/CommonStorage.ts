//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX //XXX
//XXX import { Logger } from "../../utils/Logger"
//XXX import { TConfigSource } from "../../types/TConfig"
//XXX import { TFilesDataOptions } from "../data/FilesData"


//XXX export class CommonStorage {

//XXX     ConfigSource: TConfigSource
//XXX     ConfigStorage: TFilesDataOptions

//XXX     constructor(configSource: TConfigSource) {
//XXX         this.ConfigSource = configSource
//XXX         this.ConfigStorage = configSource.options as TFilesDataOptions
//XXX         this.Init()
//XXX     }

//XXX     //XXX eslint-disable-next-line class-methods-use-this
//XXX     @Logger.LogFunction()
//XXX     Init(): void {
//XXX         Logger.Debug('Init')
//XXX     }
//XXX }