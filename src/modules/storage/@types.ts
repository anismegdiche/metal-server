//
//
//
import { TDataListEntity } from "../source/types/TDataListEntity";
import { DATA_ENTITY } from "../source/@consts";


//
export type TStorageFile = TDataListEntity & {
    mimeType: string
    type: DATA_ENTITY.FILE
    createdAt: Date
    modifiedAt: Date
    path: string
    content?: string
    parent: string
    // FolderData dynamique usage
    old_name?: string
}

export type TStorageFolder = TDataListEntity & {
    type: DATA_ENTITY.FOLDER
}

