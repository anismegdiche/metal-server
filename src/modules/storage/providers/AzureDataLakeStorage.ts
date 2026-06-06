//
//
//

import type { Readable } from "node:stream"
import type { DataLakeFileSystemClient } from "@azure/storage-file-datalake"
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
import { HttpErrorInternalServerError, NormalizeError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/types/U__source_storage_file_options"
import type { TStorageFile } from "../@types"
import { absStorageProvider } from "../base/absStorageProvider"

//
const z_U__source_storage_azdatalake_options = z.object({
	"connection-string": z.string(),
	container: z.string(),
	autocreate: z.boolean().optional(),
})

//
export type U__source_storage_azdatalake_options = z.infer<typeof z_U__source_storage_azdatalake_options>

type TAzureDataLakeStorageParams = {
	[K in keyof U__source_storage_azdatalake_options as K extends `${infer U}`
		? TConvertParams<U>
		: K]: U__source_storage_azdatalake_options[K]
}

//
export class AzureDataLakeStorage extends absStorageProvider {
	Config?: U__source_storage_file_options
	Params?: TAzureDataLakeStorageParams

	_fileSystemClient?: DataLakeFileSystemClient
	static _azureStorageFileDatalake: typeof import("@azure/storage-file-datalake")

	DEFAULT: Partial<U__source_storage_azdatalake_options> = {
		autocreate: false,
	}

	private static async _loadAzureStorageFileDatalake(): Promise<typeof import("@azure/storage-file-datalake")> {
		if (!AzureDataLakeStorage._azureStorageFileDatalake) {
			AzureDataLakeStorage._azureStorageFileDatalake = await import("@azure/storage-file-datalake")
		}
		return AzureDataLakeStorage._azureStorageFileDatalake
	}

	IsConfigValid(): boolean {
		return z_U__source_storage_azdatalake_options.safeParse(this.Config).success
	}

	@Logger.LogFunction()
	Init(): void {
		Assert.Var<U__source_storage_file_options>(this.Config, this.IsConfigValid(), "No configuration defined")
		this.Config = merge(this.DEFAULT, this.Config)

		this.Params = {
			connectionString: this.Config["connection-string"],
			container: this.Config.container,
			autocreate: this.Config.autocreate,
		}

		Assert.Var<string>(this.Params.connectionString, "No connection string defined")
		Assert.Var<string>(this.Params.container, "No container name defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<TAzureDataLakeStorageParams>(this.Params, "No params defined")
		Assert.Condition(!StringUtils.IsEmpty(this.Params.connectionString), "No connection string defined")
		Assert.Condition(!StringUtils.IsEmpty(this.Params.container), "No container name defined")

		try {
			const { connectionString, container, autocreate } = this.Params

			const azureStorageFileDatalake = await AzureDataLakeStorage._loadAzureStorageFileDatalake()
			const serviceClient = azureStorageFileDatalake.DataLakeServiceClient.fromConnectionString(connectionString)
			this._fileSystemClient = serviceClient.getFileSystemClient(container)

			// Create the container if it doesn't exist and autocreate is enabled
			if (autocreate) {
				await this._fileSystemClient.createIfNotExists()
			}
		} catch (e: unknown) {
			const _e = NormalizeError(e)
			throw new HttpErrorInternalServerError(`Azure Data Lake Storage Error: ${_e.message}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		this._fileSystemClient = undefined
	}

	@Logger.LogFunction()
	async FolderIsExist(dirName: string): Promise<boolean> {
		this.CheckPaths([dirName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")
		Assert.Var<string>(dirName, "Directory name is required")

		const directoryClient = this._fileSystemClient.getDirectoryClient(dirName)
		return directoryClient.exists()
	}

	@Logger.LogFunction()
	async FolderCreate(dirName: string): Promise<void> {
		this.CheckPaths([dirName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")
		Assert.Var<string>(dirName, "Directory name is required")

		const directoryClient = this._fileSystemClient.getDirectoryClient(dirName)
		directoryClient.create()
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")

		const folders: TStorageFile[] = []
		for await (const item of this._fileSystemClient.listPaths()) {
			if (!item.name || !item.isDirectory) continue

			folders.push(
				JsonUtils.RemoveUndefined(<TStorageFile>{
					name: item.name.split("/").pop() ?? "",
					type: DATA_ENTITY_TYPE.FOLDER,
				}),
			)
		}
		return new DataTable(undefined, folders)
	}

	@Logger.LogFunction()
	async FolderListFiles(dirName?: string): Promise<DataTable> {
		this.CheckPaths([dirName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")

		const files: TStorageFile[] = []
		try {
			for await (const item of this._fileSystemClient.listPaths({ path: dirName })) {
				if (!item.name || item.isDirectory) continue

				files.push(
					JsonUtils.RemoveUndefined(<TStorageFile>{
						name: item.name.split("/").pop(),
						mimeType: this.GetMimeType(item.name),
						type: DATA_ENTITY_TYPE.FILE,
						size: item?.contentLength,
						createdAt: item?.createdOn,
						modifiedAt: item?.lastModified,
						path: item.name,
					}),
				)
			}
		} catch (error) {
			throw new HttpErrorInternalServerError(`Failed to list files - ${error}`)
		}
		return new DataTable(dirName, files)
	}

	@Logger.LogFunction()
	async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")

		try {
			const _fileFullPath = StringUtils.Path(dirName, fileName)

			const _fileClient = this._fileSystemClient.getFileClient(_fileFullPath)
			await _fileClient.getProperties()
			return true
		} catch (error) {
			if (error instanceof Error && "code" in error && error.code === "ResourceNotFound") {
				return false
			}
			throw new HttpErrorInternalServerError(`Failed to check file existence: ${String(error)}`)
		}
	}

	@Logger.LogFunction()
	async FileRead(dirName: string, fileName: string): Promise<Readable> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")

		const _fileFullPath = StringUtils.Path(dirName, fileName)

		const _fileClient = this._fileSystemClient.getFileClient(_fileFullPath)
		const response = await _fileClient.read().catch((error) => {
			throw new HttpErrorInternalServerError(`Failed to download file - ${error}`)
		})

		return response.readableStreamBody as Readable
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")
		Assert.Var<Readable>(content, "Content is required")
		Assert.Var<string>(fileName, "File name is required")
		Assert.Var<string>(dirName, "Directory name is required")

		try {
			const buffer = await ReadableUtils.ToBuffer(content)

			const _fileFullPath = StringUtils.Path(dirName, fileName)

			const _fileClient = this._fileSystemClient.getFileClient(_fileFullPath)

			await _fileClient.create()
			await _fileClient.append(buffer, 0, buffer.length)
			await _fileClient.flush(buffer.length)
		} catch (error) {
			throw new HttpErrorInternalServerError(`Failed to upload file - ${error}`)
		}

		Logger.Debug(`File '${fileName}' uploaded successfully`)
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
		this.CheckPaths([dirName, oldFileName, newFileName])

		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")
		Assert.Var<string>(oldFileName, "Old file name is required")
		Assert.Var<string>(newFileName, "New file name is required")

		await this.FileWrite(dirName, newFileName, await this.FileRead(dirName, oldFileName))
		await this.FileDelete(dirName, oldFileName)
	}

	@Logger.LogFunction()
	async FileDelete(dirName: string, fileName: string): Promise<void> {
		this.CheckPaths([dirName, fileName])
		Assert.Var<DataLakeFileSystemClient>(this._fileSystemClient, "Connection to storage not established")
		Assert.Var<string>(fileName, "File name is required")

		const _fileFullPath = StringUtils.Path(dirName, fileName)

		const _fileClient = this._fileSystemClient.getFileClient(_fileFullPath)
		await _fileClient.delete()
	}
}
