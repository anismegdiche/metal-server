
//
//
//
//
//
import { TContentConfig } from "../data/FilesDataProvider"
import { VirtualFileSystem } from "../../utils/VirtualFileSystem"


export class CommonContent {

    EntityName: string = "DEFAULT"
    Config: TContentConfig
    RawContent?: string = undefined
    Content = new VirtualFileSystem()

    constructor(contentConfig: TContentConfig) {
        this.Config = contentConfig
    }    
}