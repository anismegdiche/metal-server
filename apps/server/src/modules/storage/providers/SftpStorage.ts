//
//
//

import { PassThrough, Readable } from "node:stream"
import { Logger } from "@metal/logger"
import { omit } from "lodash-es"
import SftpClient from "ssh2-sftp-client"
//
import { DataTable, type TRow } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { JsonUtils } from "../../../utils/JsonUtils"
import { StringUtils } from "../../../utils/StringUtils"
import type { TConvertParams } from "../../../utils/TConvertParams"
import { HttpErrorInternalServerError, HttpErrorNotFound, NormalizeError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import { type U__source_storage, z_U__source_storage } from "../../source/types/U__source_storage"
import { absStorageProvider } from "../base/absStorageProvider"
import type { TStorageFile } from "../types/TStorageFile"
import type { TStorageFolder } from "../types/TStorageFolder"
import { type U__storage_sftp, z_U__storage_sftp } from "../types/U__storage_sftp"

type TSftpStorageParams = Omit<
	{
		[K in keyof U__storage_sftp as K extends `${infer U}` ? TConvertParams<U> : K]: U__storage_sftp[K]
	},
	"storageType"
>

//
export class SftpStorage extends absStorageProvider {
	SourceConfig?: U__source_storage
	StorageConfig?: U__storage_sftp
	Params?: TSftpStorageParams

	_flagAutoCreate = false
	_sftpClient: SftpClient = new SftpClient()

	IsConfigValid(): boolean {
		return z_U__storage_sftp.safeParse(this.StorageConfig).success
	}

	@Logger.LogFunction()
	Init(): void {
		this.SourceConfig = Assert.ZodSchema<U__source_storage>(
			this.SourceConfig,
			z_U__source_storage,
			"Source configuration errors",
		)
		this.StorageConfig = Assert.ZodSchema<U__storage_sftp>(
			this.StorageConfig,
			z_U__storage_sftp,
			"Storage configuration errors",
		)

		this.Params = <TSftpStorageParams>{
			host: this.StorageConfig.host,
			port: this.StorageConfig.port,
			user: this.StorageConfig.user,
			password: this.StorageConfig.password,
			privateKey: this.StorageConfig["private-key"],
			passphrase: this.StorageConfig.passphrase,
			folder: this.StorageConfig.folder,
		}

		this._flagAutoCreate = this.SourceConfig.options.autocreate ?? false
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		try {
			const config: SftpClient.ConnectOptions = omit(this.Params, "folder") as SftpClient.ConnectOptions
			await this._sftpClient.connect(config)
		} catch (e: unknown) {
			const _e = NormalizeError(e)
			throw new HttpErrorInternalServerError(`Failed to connect to SFTP server '${this.Params.host}': ${_e.message}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		await this._sftpClient.end()
	}

	@Logger.LogFunction()
	async FolderIsExist(dirName: string): Promise<boolean> {
		this.CheckPaths([dirName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		try {
			const fullPath = StringUtils.Path(this.Params.folder, dirName)
			await this._sftpClient.stat(fullPath)
			return true
		} catch {
			return false
		}
	}

	@Logger.LogFunction()
	async FolderCreate(dirName: string): Promise<void> {
		this.CheckPaths([dirName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		const fullPath = StringUtils.Path(this.Params.folder, dirName)
		await this._sftpClient.mkdir(fullPath, true)
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")
		Assert.Var<string>(this.Params.folder, "No folder defined")

		try {
			const list = await this._sftpClient.list(this.Params.folder)

			const folders: TStorageFolder[] = list
				.filter((file) => file.type === "d")
				.map((file) =>
					JsonUtils.RemoveUndefined(<TStorageFolder>{
						name: file.name,
						type: DATA_ENTITY_TYPE.FOLDER,
					}),
				)

			return new DataTable(undefined, folders)
		} catch (error) {
			throw new HttpErrorInternalServerError(`Failed to list folders: ${(error as Error)?.message}`)
		}
	}

	@Logger.LogFunction()
	async FolderListFiles(dirName?: string): Promise<DataTable> {
		this.CheckPaths([dirName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		const targetDir = dirName ? StringUtils.Path(this.Params.folder, dirName) : this.Params.folder

		try {
			const list = await this._sftpClient.list(targetDir as string)

			const result: TRow[] = list
				.filter((file) => file.type === "-")
				.map((file) =>
					JsonUtils.RemoveUndefined(<TStorageFile>{
						name: file.name,
						mimeType: this.GetMimeType(file.name),
						type: DATA_ENTITY_TYPE.FILE,
						size: file.size,
						createdAt: file.accessTime ? new Date(file.accessTime * 1000) : undefined,
						modifiedAt: file.modifyTime ? new Date(file.modifyTime * 1000) : undefined,
						path: StringUtils.Path(targetDir, file.name),
					}),
				)

			return new DataTable(dirName, result)
		} catch (error) {
			throw new HttpErrorInternalServerError(`Failed to list files: ${(error as Error)?.message}`)
		}
	}

	@Logger.LogFunction()
	async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		try {
			const fileInfo = await this._sftpClient.stat(StringUtils.Path(this.Params.folder, dirName, fileName))
			return fileInfo !== undefined
		} catch {
			return false
		}
	}

	@Logger.LogFunction()
	async FileRead(dirName: string, fileName: string): Promise<Readable> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		if (!(await this.FileIsExist(dirName, fileName)))
			throw new HttpErrorNotFound(`File '${fileName}' does not exist on the SFTP server`)

		const content = new PassThrough()
		const readStream = this._sftpClient.createReadStream(StringUtils.Path(this.Params.folder, dirName, fileName))
		readStream.pipe(content)
		return Readable.from(content)
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		const fullPath = StringUtils.Path(this.Params.folder, dirName, fileName)
		const writeStream = this._sftpClient.createWriteStream(fullPath)

		content.pipe(writeStream)

		return new Promise((resolve, reject) => {
			writeStream.on("finish", resolve)
			writeStream.on("error", reject)
		})
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, fileName: string, newName: string): Promise<void> {
		this.CheckPaths([dirName, fileName, newName])

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")

		try {
			const oldPath = StringUtils.Path(this.Params.folder, dirName, fileName)
			const newPath = StringUtils.Path(this.Params.folder, dirName, newName)

			if (!(await this.FileIsExist(dirName, fileName))) {
				throw new HttpErrorNotFound(`File '${fileName}' does not exist on the SFTP server`)
			}

			await this._sftpClient.rename(oldPath, newPath)
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

		Assert.Var<TSftpStorageParams>(this.Params, "No params defined")
		Assert.Var<string>(fileName, "File name is required")

		await this._sftpClient.delete(StringUtils.Path(this.Params.folder, dirName, fileName))
	}
}
