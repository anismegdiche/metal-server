//
//
//
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
import { HttpErrorInternalServerError, NormalizeError } from "../../errors/HttpErrors"
import { DATA_ENTITY_TYPE } from "../../source/@consts"
import type { U__source_storage_file_options } from "../../source/types/U__source_storage_file_options"
import type { TStorageFolder } from "../types/TStorageFolder"
import type { TStorageFile } from "../types/TStorageFile"
import { absStorageProvider } from "../base/absStorageProvider"


//
const z_U__source_storage_azfs_options = z.object({
	"connection-string": z.string(),
	"share-name": z.string(),
	folder: z.string().optional(),
	autocreate: z.boolean().optional(),
})

//
export type U__source_storage_azfs_options = z.infer<typeof z_U__source_storage_azfs_options>

type TAzureFileStorageParams = {
	[K in keyof U__source_storage_azfs_options as K extends `${infer U}`
	? TConvertParams<U>
	: K]: U__source_storage_azfs_options[K]
}

//
export class AzureFileStorage extends absStorageProvider {
	Config?: U__source_storage_file_options
	Params?: TAzureFileStorageParams

	DEFAULT: Partial<U__source_storage_file_options> = {
		folder: "/",
		autocreate: false,
	}

	static _libAzureStorageFileShare: typeof import("@azure/storage-file-share")
	_shareServiceClient?: import("@azure/storage-file-share").ShareServiceClient
	_shareClient?: import("@azure/storage-file-share").ShareClient

	static async _loadLibAzureStorageFileShare(): Promise<typeof import("@azure/storage-file-share")> {
		if (!AzureFileStorage._libAzureStorageFileShare) {
			AzureFileStorage._libAzureStorageFileShare = await import("@azure/storage-file-share")
		}
		return AzureFileStorage._libAzureStorageFileShare
	}

	IsConfigValid(): boolean {
		return z_U__source_storage_azfs_options.safeParse(this.Config).success
	}

	@Logger.LogFunction()
	Init(): void {
		Assert.Var<U__source_storage_file_options>(this.Config, this.IsConfigValid(), "No config storage defined")
		this.Config = merge(this.DEFAULT, this.Config)

		this.Params = {
			connectionString: this.Config["connection-string"],
			shareName: this.Config["share-name"],
			folder: this.Config.folder,
		}

		Assert.Var<string>(this.Params.connectionString, "No connection string defined")
		Assert.Var<string>(this.Params.shareName, "No share name defined")
		Assert.Var<string>(this.Params.folder, "No folder path defined")
	}

	@Logger.LogFunction()
	async Connect(): Promise<void> {
		Assert.Var<string>(this.Params?.connectionString, "No connection string defined")
		Assert.Var<string>(this.Params.shareName, "No share name defined")

		try {
			const libAzureStorageFileShare = await AzureFileStorage._loadLibAzureStorageFileShare()
			this._shareServiceClient = libAzureStorageFileShare.ShareServiceClient.fromConnectionString(
				this.Params.connectionString,
			)
			this._shareClient = this._shareServiceClient.getShareClient(this.Params.shareName)
		} catch (e: unknown) {
			const _e = NormalizeError(e)
			throw new HttpErrorInternalServerError(`Azure File Storage Error: ${_e.message}`)
		}
	}

	@Logger.LogFunction()
	async Disconnect(): Promise<void> {
		this._shareServiceClient = undefined
		this._shareClient = undefined
	}

	@Logger.LogFunction()
	async FolderIsExist(dirName: string): Promise<boolean> {
		this.CheckPaths([dirName])

		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")
		Assert.Var<string>(dirName, "Directory name is required")

		const directoryClient = this._shareClient.getDirectoryClient(dirName)
		return directoryClient.exists()
	}

	@Logger.LogFunction()
	async FolderCreate(dirName: string): Promise<void> {
		this.CheckPaths([dirName])

		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")
		Assert.Var<string>(dirName, "Directory name is required")

		const directoryClient = this._shareClient.getDirectoryClient(dirName)
		await directoryClient.create()
	}

	@Logger.LogFunction()
	async FolderListFolders(): Promise<DataTable> {
		Assert.Var<string>(this.Params?.folder, "No folder defined")
		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")

		const directoryClient = this._shareClient.getDirectoryClient(this.Params.folder)
		const folders: TStorageFolder[] = []

		for await (const _folder of directoryClient.listFilesAndDirectories()) {
			if (_folder.kind === "directory") {
				folders.push(
					JsonUtils.RemoveUndefined(<TStorageFolder>{
						name: _folder.name,
						type: DATA_ENTITY_TYPE.FOLDER,
					}),
				)
			}
		}
		return new DataTable(undefined, folders)
	}

	@Logger.LogFunction()
	async FolderListFiles(dirName?: string): Promise<DataTable> {
		this.CheckPaths([dirName])

		Assert.Var<string>(this.Params?.folder, "No folder defined")
		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")

		const targetFolder = dirName ? StringUtils.Path(this.Params.folder, dirName) : this.Params.folder
		const directoryClient = this._shareClient.getDirectoryClient(targetFolder)
		const result: TStorageFile[] = []

		for await (const item of directoryClient.listFilesAndDirectories()) {
			if (item.kind === "file") {
				result.push(
					JsonUtils.RemoveUndefined(<TStorageFile>{
						name: item.name,
						mimeType: this.GetMimeType(item.name),
						type: DATA_ENTITY_TYPE.FILE,
						size: item.properties?.contentLength,
						createdAt: item.properties?.creationTime,
						modifiedAt: item.properties?.lastModified,
						path: item.name,
					}),
				)
			}
		}

		return new DataTable(dirName, result)
	}

	@Logger.LogFunction()
	async FileIsExist(dirName: string, fileName: string): Promise<boolean> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<string>(this.Params?.folder, "No folder defined")
		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")

		try {
			const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params.folder, dirName))
			const fileClient = directoryClient.getFileClient(fileName)
			return await fileClient.exists()
		} catch (error) {
			throw new HttpErrorInternalServerError(`Failed to check file existence - ${error}`)
		}
	}

	@Logger.LogFunction()
	async FileRead(dirName: string, fileName: string): Promise<Readable> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<string>(this.Params?.folder, "No folder defined")
		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")

		const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params.folder, dirName))
		const fileClient = directoryClient.getFileClient(fileName)
		const downloadResponse = await fileClient.download().catch((error) => {
			throw new HttpErrorInternalServerError(`Failed to download file - ${error}`)
		})
		return downloadResponse.readableStreamBody as Readable
	}

	@Logger.LogFunction(["content"])
	async FileWrite(dirName: string, fileName: string, content: Readable): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<string>(this.Params?.folder, "No folder defined")
		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")

		const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params.folder, dirName))
		await directoryClient.createIfNotExists()

		const fileClient = directoryClient.getFileClient(fileName)
		const buffer = await ReadableUtils.ToBuffer(content)

		await fileClient.create(buffer.length, { abortSignal: AbortSignal.timeout(30000) })
		await fileClient.uploadRange(buffer, 0, buffer.length, { abortSignal: AbortSignal.timeout(30000) })
	}

	@Logger.LogFunction()
	async FileRename(dirName: string, oldFileName: string, newFileName: string): Promise<void> {
		this.CheckPaths([dirName, oldFileName, newFileName])

		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")
		Assert.Var<string>(oldFileName, "Old file name is required")
		Assert.Var<string>(newFileName, "New file name is required")

		const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
		const fileClient = directoryClient.getFileClient(oldFileName)
		await fileClient.rename(newFileName)
	}

	@Logger.LogFunction()
	async FileDelete(dirName: string, fileName: string): Promise<void> {
		this.CheckPaths([dirName, fileName])

		Assert.Var<import("@azure/storage-file-share").ShareClient>(this._shareClient, "Not connected")
		Assert.Var<string>(fileName, "File name is required")

		const directoryClient = this._shareClient.getDirectoryClient(StringUtils.Path(this.Params?.folder, dirName))
		const fileClient = directoryClient.getFileClient(fileName)
		await fileClient.delete()
	}
}
