//
//
//
import { HttpErrorNotFound } from "../errors/HttpErrors"
import { Factory } from "../../utils/Factory"
import { IDataProvider } from "./base/IDataProvider"
import { DATA_PROVIDER } from "./@consts"
import { FilesData } from "./providers/FilesData"
import { MemoryData } from "./providers/MemoryData"
import { MetalData } from "./providers/MetalData"
import { MongoDbData } from "./providers/MongoDbData"
import { MySqlData } from "./providers/MySqlData"
import { PlanData } from "./providers/PlanData"
import { PostgresData } from "./providers/PostgresData"
import { SqlServerData } from "./providers/SqlServerData"
import { WebServiceData } from "./providers/WebServiceData"
import { CosmosDbData } from "./providers/CosmosDbData"
import { FolderData } from "./providers/FolderData"


//
export class DataProvider {

    static readonly #DataFactory = new Factory<IDataProvider>()

    static GetProvider(providerName: string): IDataProvider {
        if (DataProvider.#DataFactory.Has(providerName))
            return DataProvider.#DataFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorNotFound(`Data Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        DataProvider.#DataFactory.Register(DATA_PROVIDER.POSTGRES, new PostgresData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.MONGODB, new MongoDbData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.MSSQL, new SqlServerData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.METAL, new MetalData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.PLAN, new PlanData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.MEMORY, new MemoryData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.FILES, new FilesData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.MYSQL, new MySqlData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.WEBSERVICE, new WebServiceData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.COSMOSDB, new CosmosDbData())
        DataProvider.#DataFactory.Register(DATA_PROVIDER.FOLDER, new FolderData())
    }
}