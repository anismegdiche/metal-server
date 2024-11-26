//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absStorageProvider } from "./absStorageProvider"
import { AzureBlobStorage, TAzureBlobStorageConfig } from "./storage/AzureBlobStorage"
import { FsStorage, TFsStorageConfig } from "./storage/FsStorage"
import { FtpStorage, TFtpStorageConfig } from "./storage/FtpStorage"


//
export enum STORAGE {
    FILESYSTEM = "fs",
    AZURE_BLOB = "az-blob",
    FTP = "ftp"
}

export type TStorageConfig = TFsStorageConfig & TAzureBlobStorageConfig & TFtpStorageConfig


//
export class StorageProvider {

    static readonly #StorageFactory = new Factory<absStorageProvider>()

    static GetProvider(providerName: string): absStorageProvider {
        if (StorageProvider.#StorageFactory.Has(providerName))
            return StorageProvider.#StorageFactory.Get(providerName)!
        else
            throw new HttpErrorNotFound(`Storage Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        StorageProvider.#StorageFactory.Register(STORAGE.FILESYSTEM, new FsStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_BLOB, new AzureBlobStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.FTP, new FtpStorage())
    }
}