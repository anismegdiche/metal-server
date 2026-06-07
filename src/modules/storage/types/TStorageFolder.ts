//
//
//
import type { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { TDataListEntity } from "../../source/@types"


//
export type TStorageFolder = TDataListEntity & {
	type: DATA_ENTITY_TYPE.FOLDER
}
