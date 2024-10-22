 
//
//
//
//
//
import { TSourceParams } from "../../types/TSourceParams"
import { TFilesDataProviderOptions } from "../data/FilesDataProvider"

 
export class CommonContent {

    EntityName: string = "DEFAULT"
    Options: TFilesDataProviderOptions
    RawContent?: string = undefined

    constructor(sourceParams: TSourceParams) {
        this.Options = sourceParams.options as TFilesDataProviderOptions
    }
}