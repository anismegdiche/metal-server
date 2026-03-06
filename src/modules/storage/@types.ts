//
//
//
import type { DATA_ENTITY_TYPE } from "../source/@consts"
import type { TDataListEntity } from "../source/@types"
import type { U__source_storage_s3_options } from "./providers/AmazonS3Storage"
import type { U__source_storage_azblob_options } from "./providers/AzureBlobStorage"
import type { U__source_storage_azdatalake_options } from "./providers/AzureDataLakeStorage"
import type { U__source_storage_azfs_options } from "./providers/AzureFileStorage"
import type { U__source_storage_fs_options } from "./providers/FsStorage"
import type { U__source_storage_ftp_options } from "./providers/FtpStorage"
import type { U__source_storage_sftp_options } from "./providers/SftpStorage"

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

export type U__source_storage_options = U__source_storage_fs_options &
	U__source_storage_ftp_options &
	U__source_storage_azblob_options &
	U__source_storage_azfs_options &
	U__source_storage_azdatalake_options &
	U__source_storage_s3_options &
	U__source_storage_sftp_options
