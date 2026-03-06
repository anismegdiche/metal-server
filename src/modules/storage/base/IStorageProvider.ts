//
//
//
import type { Readable } from "node:stream"
//
import type { DataTable } from "../../../types/DataTable"
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { U_config_sources_source } from "../../core/types/U_config_sources"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"

//
export interface IStorageProvider extends clsClonable {
	Config?: U__source_storage_file_options

	IsConfigValid(): void

	SetConfig(configSource: U_config_sources_source): void

	Init(): void
	//
	Connect(): Promise<void>
	Disconnect(): Promise<void>
	//
	FolderIsExist(dirName: string): Promise<boolean>
	FolderCreate(dirName: string): Promise<void>
	FolderListFolders(): Promise<DataTable>
	FolderListFiles(dirName?: string): Promise<DataTable>
	//
	FileIsExist(dirName: string, fileName: string): Promise<boolean>
	FileRead(dirName: string, fileName: string): Promise<Readable>
	FileWrite(dirName: string, fileName: string, content: Readable): Promise<void>
	FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void>
	FileDelete(dirName: string, fileName: string): Promise<void>
	//
	GetMimeType(fileName?: string): string

	CheckPaths(paths: (string | undefined)[]): void
}
