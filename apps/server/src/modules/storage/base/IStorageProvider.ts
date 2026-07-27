//
//
//
import type { Readable } from "node:stream"
//
import type { DataTable } from "../../../types/DataTable"
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { U__source_storage } from "../../source/types/U__source_storage"
import type { U__storage } from "../types/U__storage"

//
export interface IStorageProvider extends clsClonable {
	SourceConfig?: U__source_storage

	StorageConfig?: U__storage

	IsConfigValid(): void

	SetConfig(configSource: U__source_storage): void

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
