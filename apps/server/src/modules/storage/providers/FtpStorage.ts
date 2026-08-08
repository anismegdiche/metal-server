//
//
//

import type { Readable } from "node:stream"
import { PassThrough } from "node:stream"
import { Logger } from "@metal/logger"
import { JsonUtils, StringUtils } from "@metal/utils"
import * as Ftp from "basic-ftp"
import { DataTable, type TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import { type U__source_storage, z_U__source_storage } from "../../source/types/U__source_storage"
import { absStorageProvider } from "../base/absStorageProvider"
import type { TStorageFile } from "../types/TStorageFile"
import type { TStorageFolder } from "../types/TStorageFolder"
import { type U__storage_ftp, z_U__storage_ftp } from "../types/U__storage_ftp"

//
export class FtpStorage extends absStorageProvider {
	SourceConfig?: U__source_storage
	StorageConfig?: U__storage_ftp
	Params?: Ftp.AccessOptions

	_ftpClient: Ftp.Client = new Ftp.Client()

	_flagAutoCreate = false

	IsConfigValid(): boolean {
		return z_U__storage_ftp.safeParse(this.StorageConfig).success
	}

	@Logger.LogFunction()
	Init(): void {
		this.SourceConfig = Assert.ZodSchema<U__source_storage>(
			this.SourceConfig,
			z_U__source_storage,
			"Source configuration errors",
		)
		this.StorageConfig = Assert.ZodSchema<U__storage_ftp>(
			this.StorageConfig,
			z_U__storage_ftp,
			"Storage configuration errors",
		)

		this.Params = {
			host: this.StorageConfig.host,
			port: this.StorageConfig.port,
			user: this.StorageConfig.user,
			password: this.StorageConfig.password,
			secure: this.StorageConfig.secure,
		}

		this._flagAutoCreate = this.SourceConfig.options.autocreate ?? false

		Assert.Var<string>(this.Params.host, "No host defined")
		Assert.Var<number>(this.Params.port, "No port defined")
		Assert.Var<string>(this.Params.user, "No user defined")
		Assert.Var<string>(this.Params.password, "No password defined")
		Assert.Var<boolean>(this.Params.secure, "No secure flag defined")
		Assert.Var<string>(this.StorageConfig.folder, "No folder path defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")

		try {
			await this._ftpClient.access(this.Params)
			Logger.Info(`Connected to FTP server '${this.Params?.host}'`)
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`FTP Storage Error: ${(e as Error).message}`)
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
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		try {
			const _dirFullPath = StringUtils.Path(this.StorageConfig.folder, dirName)

			const list = await this._ftpClient.list(this.StorageConfig.folder)
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
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		const _dirFullPath = StringUtils.Path(this.StorageConfig.folder, dirName)

		await this._ftpClient.ensureDir(_dirFullPath)
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		const list = await this._ftpClient.list(this.StorageConfig.folder).catch((error) => {
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
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		const targetDir = dirName ? StringUtils.Path(this.StorageConfig.folder, dirName) : this.StorageConfig.folder

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
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		try {
			const __targetFile = StringUtils.Path(this.StorageConfig.folder, dirName, fileName)

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
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		if (!(await this.FileIsExist(dirName, fileName)))
			throw new HttpErrorNotFound(`File '${fileName}' does not exist on the FTP server`)

		// Return the PassThrough immediately and let the download write into it
		// as data arrives, instead of awaiting the full transfer (which buffers
		// the entire file in memory before the caller gets a stream)
		const content = new PassThrough()

		const __targetFile = StringUtils.Path(this.StorageConfig.folder, dirName, fileName)

		this._ftpClient.downloadTo(content, __targetFile).catch((error: Error) => {
			content.destroy(error)
		})
		return content
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		const fullPath = StringUtils.Path(this.StorageConfig.folder, dirName, fileName)

		if (this._flagAutoCreate && !(await this.FileIsExist(dirName, fileName)))
			await this._ftpClient.uploadFrom(content, fullPath)
		else await this._ftpClient.appendFrom(content, fullPath)
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, fileName: string, newName: string): Promise<void> {
		this.CheckPaths([dirName, fileName, newName])

		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		try {
			const oldPath = StringUtils.Path(this.StorageConfig.folder, dirName, fileName)
			const newPath = StringUtils.Path(this.StorageConfig.folder, dirName, newName)

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

		Assert.Var<U__storage_ftp>(this.StorageConfig, this.IsConfigValid(), "Storage configuration errors")
		Assert.Var<Ftp.AccessOptions>(this.Params, "No params defined")
		Assert.Var<string>(fileName, "File name is required")
		Assert.Var<string>(this.StorageConfig.folder, "No folder defined")

		await this._ftpClient.remove(StringUtils.Path(this.StorageConfig.folder, dirName, fileName))
	}
}
