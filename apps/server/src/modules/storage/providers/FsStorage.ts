//
//
//

import * as fs from "node:fs"
import type { Readable } from "node:stream"
import { merge } from "lodash-es"
import z from "zod"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import { StringUtils } from "../../../utils/StringUtils"
import type { TConvertParams } from "../../../utils/TConvertParams"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/types/U__source_storage_file_options"
import { absStorageProvider } from "../base/absStorageProvider"
import type { TStorageFile } from "../types/TStorageFile"
import type { TStorageFolder } from "../types/TStorageFolder"

//
const z_U__source_storage_fs_options = z.object({
	folder: z.string(),
	autocreate: z.boolean().optional(),
})

//
export type U__source_storage_fs_options = z.infer<typeof z_U__source_storage_fs_options>

type TFsStorageParams = {
	[K in keyof U__source_storage_fs_options as K extends `${infer U}`
	? TConvertParams<U>
	: K]: U__source_storage_fs_options[K]
}

//
export class FsStorage extends absStorageProvider {
	Config?: U__source_storage_file_options
	Params?: TFsStorageParams

	DEFAULT: Partial<U__source_storage_fs_options> = {
		autocreate: false,
	}

	IsConfigValid(): boolean {
		return z_U__source_storage_fs_options.safeParse(this.Config).success
	}

	@Logger.LogFunction()
	Init(): void {
		Assert.Var<U__source_storage_fs_options>(this.Config, this.IsConfigValid(), "No configuration defined")
		this.Config = merge(this.DEFAULT, this.Config)

		this.Params = {
			folder: this.Config.folder,
			autocreate: this.Config.autocreate,
		}

		Assert.Var<string>(this.Params.folder, "No folder path defined")
		Assert.Var<boolean>(this.Params.autocreate, "No autocreate flag defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		const isFolderExists = await this.FolderIsExist("")
		if (!isFolderExists) {
			throw new HttpErrorInternalServerError(`Folder '${this.Params?.folder}' does not exist`)
		}
		Logger.Debug(`${Logger.Out} FsStorage: Connected`)
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		Logger.Debug(`${Logger.Out} FsStorage: Disconnected`)
	}

	@Logger.LogFunction()
	async FolderIsExist(dirName: string): Promise<boolean> {
		this.CheckPaths([dirName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _folderPath = StringUtils.FsPath(this.Params.folder, dirName)

		return fs.existsSync(_folderPath)
	}

	@Logger.LogFunction()
	async FolderCreate(dirName: string): Promise<void> {
		this.CheckPaths([dirName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _folderPath = StringUtils.FsPath(this.Params.folder, dirName)

		if (!fs.existsSync(_folderPath)) fs.mkdirSync(_folderPath)
	}

	@Logger.LogFunction()
	async FolderListFiles(dirName?: string): Promise<DataTable> {
		this.CheckPaths([dirName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _folderPath = dirName ? StringUtils.FsPath(this.Params.folder, dirName) : this.Params.folder

		const data = await fs.promises
			.readdir(_folderPath, { withFileTypes: true })
			.then((files) =>
				files
					.filter((file) => !file.isDirectory())
					.map((file) => {
						const fullPath = StringUtils.FsPath(file.parentPath, file.name)
						const stats = fs.statSync(fullPath)
						return JsonUtils.RemoveUndefined(<TStorageFile>{
							name: file.name,
							mimeType: this.GetMimeType(file.name),
							type: DATA_ENTITY_TYPE.FILE,
							size: stats.size,
							createdAt: stats.birthtime,
							modifiedAt: stats.mtime,
							path: fullPath,
						})
					}),
			)
			.catch((error) => {
				throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params?.folder}': ${error.message}`)
			})

		return new DataTable(dirName, data)
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<TFsStorageParams>(this.Params, "No params defined")
		Assert.Var<string>(this.Params.folder, this.Params.folder !== undefined, "No folder defined")

		const _folders = await fs.promises
			.readdir(this.Params.folder, { withFileTypes: true })
			.then((folders) =>
				folders
					.filter((folder) => folder.isDirectory())
					.map((folder) => {
						return JsonUtils.RemoveUndefined(<TStorageFolder>{
							name: folder.name,
							type: DATA_ENTITY_TYPE.FOLDER,
						})
					}),
			)
			.catch((error) => {
				throw new HttpErrorInternalServerError(`Failed to read folder '${this.Params?.folder}': ${error.message}`)
			})

		return new DataTable(undefined, _folders)
	}

	@Logger.LogFunction()
	async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _fileFullPath = StringUtils.FsPath(this.Params.folder, dirName, fileName)

		return fs.existsSync(_fileFullPath)
	}

	@Logger.LogFunction()
	async FileRead(dirName: string, fileName: string): Promise<Readable> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _fileFullPath = StringUtils.FsPath(this.Params.folder, dirName, fileName)

		if (this.Params.autocreate && !(await this.FileIsExist(dirName, fileName))) {
			const _fd = fs.openSync(_fileFullPath, "wx")
			await fs.promises.writeFile(_fileFullPath, "", "utf8")
			fs.closeSync(_fd)
		}

		if (await this.FileIsExist(dirName, fileName)) return ReadableUtils.FromReadStream(fs.createReadStream(_fileFullPath))

		throw new HttpErrorNotFound(`File '${fileName}' does not exist`)
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _fileFullPath = StringUtils.FsPath(this.Params.folder, dirName, fileName)

		if (this.Params.autocreate && !(await this.FileIsExist(dirName, fileName))) {
			const _fd = fs.openSync(_fileFullPath, "wx")
			await fs.promises.writeFile(_fileFullPath, "", "utf8")
			fs.closeSync(_fd)
		}
		await fs.promises.writeFile(_fileFullPath, content, "utf8")
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
		this.CheckPaths([dirName, oldFileName, newFileName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")
		const _oldFileFullPath = StringUtils.FsPath(this.Params.folder, dirName, oldFileName)

		if (fs.existsSync(_oldFileFullPath)) {
			const _newFileFullPath = StringUtils.FsPath(this.Params.folder, dirName, newFileName)

			fs.renameSync(_oldFileFullPath, _newFileFullPath)
		}
	}

	@Logger.LogFunction()
	async FileDelete(dirName: string, fileName: string): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TFsStorageParams>(this.Params, "No params defined")

		const _fileFullPath = StringUtils.FsPath(this.Params.folder, dirName, fileName)

		if (fs.existsSync(_fileFullPath)) fs.unlinkSync(_fileFullPath)
	}
}
