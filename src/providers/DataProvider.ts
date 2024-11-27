//
//
//
//
//
import { HttpErrorNotFound } from "../server/HttpErrors"
import { Factory } from "../utils/Factory"
import { absDataProvider } from "./absDataProvider"
import { FilesData } from "./data/FilesData"
import { MemoryData } from "./data/MemoryData"
import { MetalData } from "./data/MetalData"
import { MongoDbData } from "./data/MongoDbData"
import { MySqlData } from "./data/MySqlData"
import { PlanData } from "./data/PlanData"
import { PostgresData } from "./data/PostgresData"
import { SqlServerData } from "./data/SqlServerData"


//
export enum DATA_PROVIDER {
    METAL = "metal",
    PLAN = "plan",
    MEMORY = "memory",
    POSTGRES = "postgres",
    MONGODB = "mongodb",
    MSSQL = "mssql",
    FILES = "files",
    MYSQL = "mysql"
}


//
export class DataProvider {

    static readonly #StorageFactory = new Factory<absDataProvider>()

    static GetProvider(providerName: string): absDataProvider {
        if (DataProvider.#StorageFactory.Has(providerName))
            return DataProvider.#StorageFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`Data Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.POSTGRES, new PostgresData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.MONGODB, new MongoDbData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.MSSQL, new SqlServerData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.METAL, new MetalData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.PLAN, new PlanData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.MEMORY, new MemoryData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.FILES, new FilesData())
        DataProvider.#StorageFactory.Register(DATA_PROVIDER.MYSQL, new MySqlData())
    }
}