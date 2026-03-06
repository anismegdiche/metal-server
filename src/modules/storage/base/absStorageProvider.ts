//
//
//

import type { Readable } from "node:stream"
import { lookup } from "mime-types"
//
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { clsClonable } from "../../../utils/base/clsClonable"
import { StringUtils } from "../../../utils/StringUtils"
import type { U_config_sources_source } from "../../core/types/U_config_sources"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"
import type { IStorageProvider } from "./IStorageProvider"

//
export abstract class absStorageProvider extends clsClonable implements IStorageProvider {
	// NOSONAR

	abstract Config?: U__source_storage_file_options

	abstract IsConfigValid(): void

	SetConfig(configSource: U_config_sources_source) {
		this.Config = configSource.options as U__source_storage_file_options
		this.Init()
	}

	abstract Init(): void
	//
	abstract Connect(): Promise<void>
	abstract Disconnect(): Promise<void>
	//
	abstract FolderIsExist(dirName: string): Promise<boolean>
	abstract FolderCreate(dirName: string): Promise<void>
	abstract FolderListFolders(): Promise<DataTable>
	abstract FolderListFiles(dirName?: string): Promise<DataTable>
	//
	abstract FileIsExist(dirName: string, fileName: string): Promise<boolean>
	abstract FileRead(dirName: string, fileName: string): Promise<Readable>
	abstract FileWrite(dirName: string, fileName: string, content: Readable): Promise<void>
	abstract FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void>
	abstract FileDelete(dirName: string, fileName: string): Promise<void>
	//
	GetMimeType(fileName?: string): string {
		if (!fileName) return "application/x-unknown"

		return lookup(fileName) || "application/octet-stream"
	}

	CheckPaths(paths: (string | undefined)[]) {
		paths.forEach((path) => {
			Assert.Condition(!StringUtils.IsMaliciousPath(path), `Path '${path}' is malicious`)
		})
	}
}
