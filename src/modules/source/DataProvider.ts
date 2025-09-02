//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { IDataProvider } from "./base/IDataProvider"
import { DATA_PROVIDER } from "./@consts"

type ProviderLoader = () => Promise<{ new(): IDataProvider }>;

type ProviderMap = {
    [key in DATA_PROVIDER]: ProviderLoader;
};

export class DataProvider {
    static readonly #dataFactory = new Factory<IDataProvider>();
    static readonly #loadingPromises = new Map<DATA_PROVIDER, Promise<IDataProvider>>();

    static readonly #providerMap: ProviderMap = {
        [DATA_PROVIDER.POSTGRES]: () => import('./providers/PostgresData').then(m => m.PostgresData),
        [DATA_PROVIDER.MONGODB]: () => import('./providers/MongoDbData').then(m => m.MongoDbData),
        [DATA_PROVIDER.MSSQL]: () => import('./providers/SqlServerData').then(m => m.SqlServerData),
        [DATA_PROVIDER.METAL]: () => import('./providers/MetalData').then(m => m.MetalData),
        [DATA_PROVIDER.PLAN]: () => import('./providers/PlanData').then(m => m.PlanData),
        [DATA_PROVIDER.MEMORY]: () => import('./providers/MemoryData').then(m => m.MemoryData),
        [DATA_PROVIDER.FILES]: () => import('./providers/FilesData').then(m => m.FilesData),
        [DATA_PROVIDER.MYSQL]: () => import('./providers/MySqlData').then(m => m.MySqlData),
        [DATA_PROVIDER.WEBSERVICE]: () => import('./providers/WebServiceData').then(m => m.WebServiceData),
        [DATA_PROVIDER.COSMOSDB]: () => import('./providers/CosmosDbData').then(m => m.CosmosDbData),
        [DATA_PROVIDER.FOLDER]: () => import('./providers/FolderData').then(m => m.FolderData)
    };

    /**
     * Get a data provider instance by name
     * @param providerName Name of the data provider to get
     * @returns A promise that resolves to a new instance of the requested data provider
     */
    static async GetProvider(providerName: DATA_PROVIDER): Promise<IDataProvider> {
        // If already loaded, return from factory
        if (DataProvider.#dataFactory.Has(providerName)) {
            return DataProvider.#dataFactory.Get(providerName)!.Clone();
        }

        // If already loading, return the existing promise
        const existingPromise = DataProvider.#loadingPromises.get(providerName);
        if (existingPromise) {
            return existingPromise.then(provider => provider.Clone());
        }

        // Get the provider loader from the map
        const providerLoader = DataProvider.#providerMap[providerName];
        if (!providerLoader) {
            throw new HttpErrorNotFound(`Data Provider '${providerName}' not found`);
        }

        // Create a loading promise
        const loadPromise = (async () => {
            try {
                const ProviderClass = await providerLoader();
                const provider = new ProviderClass();
                DataProvider.#dataFactory.Register(providerName, provider);
                return provider;
            } finally {
                DataProvider.#loadingPromises.delete(providerName);
            }
        })();

        // Store the loading promise to prevent duplicate loads
        DataProvider.#loadingPromises.set(providerName, loadPromise);
        const provider = await loadPromise;
        return provider.Clone();
    }
}