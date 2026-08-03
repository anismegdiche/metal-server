//
//
//
import type { Readable } from "node:stream"
import { StringUtils } from "@metal/utils"
import { lookup } from "mime-types"
import type { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { clsClonable } from "../../../utils/base/clsClonable"
import type { U__source_storage } from "../../source/types/U__source_storage"
import type { U__storage } from "../types/U__storage"
import type { IStorageProvider } from "./IStorageProvider"

//
export abstract class absStorageProvider extends clsClonable implements IStorageProvider {
	abstract SourceConfig?: U__source_storage
	abstract StorageConfig?: U__storage

	abstract IsConfigValid(): void

	SetConfig(sourceConfig: U__source_storage) {
		this.SourceConfig = sourceConfig
		this.StorageConfig = (sourceConfig as U__source_storage).options as U__storage
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
