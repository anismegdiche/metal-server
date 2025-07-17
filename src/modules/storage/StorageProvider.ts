//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Assert } from "../../utils/Assert"
import { Factory } from "../../utils/Factory"
import { absStorageProvider } from "./base/absStorageProvider"
import { STORAGE } from "./@consts"
import { AmazonS3Storage } from "./providers/AmazonS3Storage"
import { AzureBlobStorage } from "./providers/AzureBlobStorage"
import { AzureDataLakeStorage } from "./providers/AzureDataLakeStorage"
import { AzureFileStorage } from "./providers/AzureFileStorage"
import { FsStorage } from "./providers/FsStorage"
import { FtpStorage } from "./providers/FtpStorage"


//
export class StorageProvider {

    static readonly #StorageFactory = new Factory<absStorageProvider>()

    static GetProvider(providerName?: string): absStorageProvider {
        Assert<string>(providerName, providerName !== undefined, 'StorageProvider.GetProvider: providerName is required')
        Assert(Object.values(STORAGE).includes(providerName as STORAGE), 'StorageProvider.GetProvider: providerName is invalid')

        if (StorageProvider.#StorageFactory.Has(providerName))
            return StorageProvider.#StorageFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`Storage Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        StorageProvider.#StorageFactory.Register(STORAGE.FILESYSTEM, new FsStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.FTP, new FtpStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_BLOB, new AzureBlobStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_FILE, new AzureFileStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AZURE_DATALAKE_G2, new AzureDataLakeStorage())
        StorageProvider.#StorageFactory.Register(STORAGE.AMAZON_S3, new AmazonS3Storage())
    }
}