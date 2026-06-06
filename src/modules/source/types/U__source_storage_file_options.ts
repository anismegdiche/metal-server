import type { STORAGE } from "../../storage/@consts"
import type { U__source_storage_options } from "../../storage/@types"
import type { U__source_storage_file_content } from "../types/U__source_storage_file_content"


export type U__source_storage_file_options = {
	// Common
	"storage-type"?: STORAGE
	content?: U__source_storage_file_content
	autocreate?: boolean
} & U__source_storage_options
