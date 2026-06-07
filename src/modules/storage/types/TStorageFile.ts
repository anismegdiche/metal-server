//
//
//
import type { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { TDataListEntity } from "../../source/@types"


//
export type TStorageFile = TDataListEntity & {
	mimeType: string
	type: DATA_ENTITY_TYPE.FILE
	createdAt: Date
	modifiedAt: Date
	path: string
	content?: string
}
