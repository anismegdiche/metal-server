//

import { PassThrough, Readable } from "node:stream"
import * as Ftp from "basic-ftp"
import { merge } from "lodash-es"
import z from "zod"
//
import { DataTable, type TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { Logger } from "../../../utils/Logger"
import { StringUtils } from "../../../utils/StringUtils"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/providers/StorageFilesData"
import type { TStorageFile, TStorageFolder } from "../@types"
import { absStorageProvider } from "../base/absStorageProvider"

//
const z_U__source_storage_ftp_options = z.object({
	host: z.string(),
	port: z.number().optional(),
	user: z.string(),
	password: z.string(),
	secure: z.boolean().optional(),
	folder: z.string().optional(),
	autocreate: z.boolean().optional(),
})

//
export type U__source_storage_ftp_options = z.infer<typeof z_U__source_storage_ftp_options>

//
export class FtpStorage extends absStorageProvider {
	Config?: U__source_storage_file_options
	Params?: Ftp.AccessOptions

	_ftpClient: Ftp.Client = new Ftp.Client()

	DEFAULT: Partial<U__source_storage_ftp_options> = {
		port: 21,
		secure: false,
		folder: "/",
		autocreate: false,
	}

	IsConfigValid(): boolean {
		return z_U__source_storage_ftp_options.safeParse(this.Config).success
	}

	@Logger.LogFunction()
	Init(): void {
		Assert.Var<U__source_storage_file_options>(this.Config, this.IsConfigValid(), "No config storage defined")
		this.Config = merge(this.DEFAULT, this.Config)

		this.Params = {
			host: this.Config.host,
			port: this.Config.port,
			user: this.Config.user,
			password: this.Config.password,
			secure: this.Config.secure,
		}

		Assert.Var<string>(this.Params.host, "No host defined")
		Assert.Var<number>(this.Params.port, "No port defined")
		Assert.Var<string>(this.Params.user, "No user defined")
		Assert.Var<string>(this.Params.password, "No password defined")
		Assert.Var<boolean>(this.Params.secure, "No secure flag defined")
		Assert.Var<string>(this.Config.folder, "No folder path defined")
		Assert.Var<boolean>(this.Config.autocreate, "No autocreate flag defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")

		try {
			await this._ftpClient.access(this.Params)
			Logger.Info(`Connected to FTP server '${this.Params?.host}'`)
		} catch (e: unknown) {
			const _e = NormalizeError(e)
			throw new HttpErrorInternalServerError(`FTP Storage Error: ${_e.message}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		this._ftpClient.close()
	}

	@Logger.LogFunction()
	async FolderIsExist(dirName: string): Promise<boolean> {
		this.CheckPaths([dirName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		try {
			const _dirFullPath = StringUtils.Path(this.Config.folder, dirName)

			const list = await this._ftpClient.list(this.Config.folder)
			const folderExists = list.some((item) => item.isDirectory && item.name === dirName)
			return folderExists
		} catch {
			return false
		}
	}

	@Logger.LogFunction()
	async FolderCreate(dirName: string): Promise<void> {
		this.CheckPaths([dirName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		const _dirFullPath = StringUtils.Path(this.Config.folder, dirName)

		await this._ftpClient.ensureDir(_dirFullPath)
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		const list = await this._ftpClient.list(this.Config.folder).catch((error) => {
			throw new HttpErrorInternalServerError(`Failed to list folders: ${(error as Error)?.message}`)
		})

		const folders: TStorageFolder[] = list
			.filter((file) => file.isDirectory)
			.map((file) =>
				JsonUtils.RemoveUndefined(<TStorageFolder>{
					name: file.name,
					type: DATA_ENTITY_TYPE.FOLDER,
				}),
			)

		return new DataTable(undefined, folders)
	}

	@Logger.LogFunction()
	async FolderListFiles(dirName?: string): Promise<DataTable> {
		this.CheckPaths([dirName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		const targetDir = dirName ? StringUtils.Path(this.Config.folder, dirName) : this.Config.folder

		const list = await this._ftpClient.list(targetDir).catch((error) => {
			throw new HttpErrorInternalServerError(`Failed to list files: ${(error as Error)?.message}`)
		})

		const result: TRow[] = list
			.filter((file) => !file.isDirectory)
			.map((file) =>
				JsonUtils.RemoveUndefined(<TStorageFile>{
					name: file.name,
					mimeType: this.GetMimeType(file.name),
					type: DATA_ENTITY_TYPE.FILE,
					size: file.size,
					createdAt: file.rawModifiedAt ? new Date(file.rawModifiedAt) : undefined,
					modifiedAt: file.rawModifiedAt ? new Date(file.rawModifiedAt) : undefined,
					path: StringUtils.Path(targetDir, file.name),
				}),
			)

		return new DataTable(dirName, result)
	}

	@Logger.LogFunction()
	async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		try {
			const __targetFile = StringUtils.Path(this.Config.folder, dirName, fileName)

			const fileInfo = await this._ftpClient.size(__targetFile)
			return fileInfo !== -1
		} catch {
			return false
		}
	}

	@Logger.LogFunction()
	async FileRead(dirName: string, fileName: string): Promise<Readable> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		if (!(await this.FileIsExist(dirName, fileName)))
			throw new HttpErrorNotFound(`File '${fileName}' does not exist on the FTP server`)

		const content = new PassThrough()

		const __targetFile = StringUtils.Path(this.Config.folder, dirName, fileName)

		await this._ftpClient.downloadTo(content, __targetFile)
		return Readable.from(content)
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		const fullPath = StringUtils.Path(this.Config.folder, dirName, fileName)

		if (this.Config.autocreate && !(await this.FileIsExist(dirName, fileName)))
			await this._ftpClient.uploadFrom(content, fullPath)
		else await this._ftpClient.appendFrom(content, fullPath)
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, fileName: string, newName: string): Promise<void> {
		this.CheckPaths([dirName, fileName, newName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		try {
			const oldPath = StringUtils.Path(this.Config.folder, dirName, fileName)
			const newPath = StringUtils.Path(this.Config.folder, dirName, newName)

			if (!(await this.FileIsExist(dirName, fileName))) {
				throw new HttpErrorNotFound(`File '${fileName}' does not exist on the FTP server`)
			}

			await this._ftpClient.rename(oldPath, newPath)
		} catch (error) {
			if (error instanceof HttpErrorNotFound) {
				throw error
			}
			throw new HttpErrorInternalServerError(`Failed to rename file from '${fileName}' to '${newName}': ${String(error)}`)
		}
	}

	@Logger.LogFunction()
	async FileDelete(dirName: string, fileName: string): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(fileName, "File name is required")
		Assert.Var<string>(this.Config?.folder, "No folder defined")

		await this._ftpClient.remove(StringUtils.Path(this.Config.folder, dirName, fileName))
	}
}
