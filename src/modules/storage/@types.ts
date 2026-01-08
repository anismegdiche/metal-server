//
//
//
import type { TDataListEntity } from "../source/types/TDataListEntity";
import { DATA_ENTITY_TYPE } from "../source/@consts";


//
export type TStorageFile = TDataListEntity & {
    mimeType: string
    type: DATA_ENTITY_TYPE.FILE
    createdAt: Date
    modifiedAt: Date
    path: string
    content?: string
}

export type TStorageFolder = TDataListEntity & {
    type: DATA_ENTITY_TYPE.FOLDER
}

