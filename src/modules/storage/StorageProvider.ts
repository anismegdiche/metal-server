//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { absStorageProvider } from "./base/absStorageProvider"
import { STORAGE } from "./@consts"

type ProviderLoader = () => Promise<{ new(): absStorageProvider }>;

type ProviderMap = {
    [key in STORAGE]: ProviderLoader;
};

export class StorageProvider {
    static readonly #storageFactory = new Factory<Promise<absStorageProvider>>();
    static readonly #loadingPromises = new Map<STORAGE, Promise<absStorageProvider>>();
    static readonly #providerMap: ProviderMap = {
        [STORAGE.FILESYSTEM]: () => import('./providers/FsStorage').then(m => m.FsStorage),
        [STORAGE.FTP]: () => import('./providers/FtpStorage').then(m => m.FtpStorage),
        [STORAGE.AZURE_BLOB]: () => import('./providers/AzureBlobStorage').then(m => m.AzureBlobStorage),
        [STORAGE.AZURE_FILE]: () => import('./providers/AzureFileStorage').then(m => m.AzureFileStorage),
        [STORAGE.AZURE_DATALAKE_G2]: () => import('./providers/AzureDataLakeStorage').then(m => m.AzureDataLakeStorage),
        [STORAGE.AMAZON_S3]: () => import('./providers/AmazonS3Storage').then(m => m.AmazonS3Storage)
    };

    static async GetProvider(providerName: STORAGE): Promise<absStorageProvider> {
        // If already loaded, return from factory
        if (StorageProvider.#storageFactory.Has(providerName)) {
            const provider = await StorageProvider.#storageFactory.Get(providerName);
            return provider!.Clone();
        }

        // If already loading, return the existing promise
        const existingPromise = StorageProvider.#loadingPromises.get(providerName);
        if (existingPromise) {
            const provider = await existingPromise;
            return provider.Clone();
        }

        // Get the provider loader from the map
        const providerLoader = StorageProvider.#providerMap[providerName];
        if (!providerLoader) {
            throw new HttpErrorNotFound(`Storage Provider '${providerName}' not found`);
        }

        // Create a loading promise
        const loadPromise = (async () => {
            try {
                const ProviderClass = await providerLoader();
                const provider = new ProviderClass();
                StorageProvider.#storageFactory.Register(providerName, Promise.resolve(provider));
                return provider;
            } finally {
                StorageProvider.#loadingPromises.delete(providerName);
            }
        })();

        // Store the loading promise to prevent duplicate loads
        StorageProvider.#loadingPromises.set(providerName, loadPromise);
        const provider = await loadPromise;
        return provider.Clone();
    }
}