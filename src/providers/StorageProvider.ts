//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absStorageProvider } from "./absStorageProvider"
import { AmazonS3Storage, TAmazonS3StorageConfig } from "./storage/AmazonS3Storage"
import { AzureBlobStorage, TAzureBlobStorageConfig } from "./storage/AzureBlobStorage"
import { AzureDataLakeStorage, TAzureDataLakeStorageConfig } from "./storage/AzureDataLakeStorage"
import { AzureFileStorage, TAzureFileStorageConfig } from "./storage/AzureFileStorage"
import { FsStorage, TFsStorageConfig } from "./storage/FsStorage"
import { FtpStorage, TFtpStorageConfig } from "./storage/FtpStorage"
import { SmbStorage, TSmbStorageConfig } from "./storage/SmbStorage"


//
export enum STORAGE {
    FILESYSTEM = "fs",
    FTP = "ftp",
    SMB = "smb",
    AZURE_BLOB = "az-blob",
    AZURE_FILE = "az-file",
    AZURE_DATALAKE_G2 = "az-datalake",
    AMAZON_S3 = "s3"
}

export type TStorageConfig = TFsStorageConfig
    & TFtpStorageConfig
    & TSmbStorageConfig
    & TAzureBlobStorageConfig
    & TAzureFileStorageConfig
    & TAzureDataLakeStorageConfig
    & TAmazonS3StorageConfig


//
export class StorageProvider {

    static readonly #StorageFactory = new Factory<absStorageProvider>()

    static GetProvider(providerName: string): absStorageProvider {
        if (StorageProvider.#StorageFactory.Has(providerName))
            return StorageProvider.#StorageFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`Storage Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        StorageProvider.#StorageFactory.Register(STORAGE.FILESYSTEM, new FsStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.FTP, new FtpStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.SMB, new SmbStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_BLOB, new AzureBlobStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_FILE, new AzureFileStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_DATALAKE_G2, new AzureDataLakeStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AMAZON_S3, new AmazonS3Storage())
    }
}