//
//
//

import type { Readable } from "node:stream"
import type { DataLakeFileSystemClient } from "@azure/storage-file-datalake"
import { Logger } from "@metal/logger"
import { JsonUtils, StringUtils } from "@metal/utils"
//
import { DataTable } from "../../../types/DataTable"
import { Assert } from "../../../utils/Assert"
import { ReadableUtils } from "../../../utils/ReadableUtils"
import type { TConvertParams } from "../../../utils/TConvertParams"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import { type U__source_storage, z_U__source_storage } from "../../source/types/U__source_storage"
import { absStorageProvider } from "../base/absStorageProvider"
import type { TStorageFile } from "../types/TStorageFile"
import { type U__storage_azdatalake, z_U__storage_azdatalake } from "../types/U__storage_azdatalake"

//
type TAzureDataLakeStorageParams = Omit<
	{
		[K in keyof U__storage_azdatalake as K extends `${infer U}` ? TConvertParams<U> : K]: U__storage_azdatalake[K]
	},
	"storageType"
>

//
export class AzureDataLakeStorage extends absStorageProvider {
	SourceConfig?: U__source_storage
	StorageConfig?: U__storage_azdatalake
	Params?: TAzureDataLakeStorageParams

	_flagAutoCreate = false

	_fileSystemClient?: DataLakeFileSystemClient
	static _azureStorageFileDatalake: typeof import("@azure/storage-file-datalake")

	private static async _loadAzureStorageFileDatalake(): Promise<typeof import("@azure/storage-file-datalake")> {
		if (!AzureDataLakeStorage._azureStorageFileDatalake) {
			AzureDataLakeStorage._azureStorageFileDatalake = await import("@azure/storage-file-datalake")
		}
		return AzureDataLakeStorage._azureStorageFileDatalake
	}

	IsConfigValid(): boolean {
		return z_U__storage_azdatalake.safeParse(this.StorageConfig).success
	}

	@Logger.LogFunction()
	Init(): void {
		this.SourceConfig = Assert.ZodSchema<U__source_storage>(
			this.SourceConfig,
			z_U__source_storage,
			"Source configuration errors",
		)
		this.StorageConfig = Assert.ZodSchema<U__storage_azdatalake>(
			this.StorageConfig,
			z_U__storage_azdatalake,
			"Storage configuration errors",
		)

		this.Params = {
			connectionString: this.StorageConfig["connection-string"],
			container: this.StorageConfig.container,
		}

		this._flagAutoCreate = this.SourceConfig.options.autocreate ?? false

		Assert.Var<string>(this.Params.connectionString, "No connection string defined")
		Assert.Var<string>(this.Params.container, "No container name defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<TAzureDataLakeStorageParams>(this.Params, "No params defined")
		Assert.Condition(!StringUtils.IsEmpty(this.Params.connectionString), "No connection string defined")
		Assert.Condition(!StringUtils.IsEmpty(this.Params.container), "No container name defined")

		try {
			const { connectionString, container } = this.Params

			const azureStorageFileDatalake = await AzureDataLakeStorage._loadAzureStorageFileDatalake()
			const serviceClient = azureStorageFileDatalake.DataLakeServiceClient.fromConnectionString(connectionString)
			this._fileSystemClient = serviceClient.getFileSystemClient(container)

			// Create the container if it doesn't exist and autocreate is enabled
			if (this._flagAutoCreate) {
				await this._fileSystemClient.createIfNotExists()
			}
		} catch (e: unknown) {
			throw new HttpErrorInternalServerError(`Azure Data Lake Storage Error: ${(e as Error).message}`)
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
