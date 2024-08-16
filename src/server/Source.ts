//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { IDataProvider } from '../types/IDataProvider'
import { TSourceParams } from '../types/TSourceParams'
import { RESPONSE } from '../lib/Const'
import { TSchemaResponse, TSchemaResponseNoData } from '../types/TSchemaResponse'
// Providers
import { PostgresDataProvider } from '../providers/data/PostgresDataProvider'
import { MongoDbDataProvider } from '../providers/data/MongoDbDataProvider'
import { SqlServerDataProvider } from '../providers/data/SqlServerDataProvider'
import { PlanDataProvider } from '../providers/data/PlanDataProvider'
import { FilesDataProvider } from '../providers/data/FilesDataProvider'
import { MemoryDataProvider } from '../providers/data/MemoryDataProvider'
import { MetalDataProvider } from '../providers/data/MetalDataProvider'
import _ from "lodash"

//  config types
//
 
enum DATA_PROVIDER {
    METAL = "metal",
    PLAN = "plan",
    MEMORY = "memory",
    POSTGRES = "postgres",
    MONGODB = "mongodb",
    MSSQL = "mssql",
    FILES = "files"
} 

export default DATA_PROVIDER

//
//
export class Source {

    // global sources
    static Sources: Record<string, IDataProvider> = {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static #NewProviderCaseMap: Record<DATA_PROVIDER, Function> = {
        [DATA_PROVIDER.METAL]: (source: string, sourceParams: TSourceParams) => new MetalDataProvider(source, sourceParams),
        [DATA_PROVIDER.PLAN]: (source: string, sourceParams: TSourceParams) => new PlanDataProvider(source, sourceParams),
        [DATA_PROVIDER.MEMORY]: (source: string, sourceParams: TSourceParams) => new MemoryDataProvider(source, sourceParams),
        [DATA_PROVIDER.POSTGRES]: (source: string, sourceParams: TSourceParams) => new PostgresDataProvider(source, sourceParams),
        [DATA_PROVIDER.MONGODB]: (source: string, sourceParams: TSourceParams) => new MongoDbDataProvider(source, sourceParams),
        [DATA_PROVIDER.MSSQL]: (source: string, sourceParams: TSourceParams) => new SqlServerDataProvider(source, sourceParams),
        [DATA_PROVIDER.FILES]: (source: string, sourceParams: TSourceParams) => new FilesDataProvider(source, sourceParams)
    }

    static async Connect(source: string | null, sourceParams: TSourceParams): Promise<void> {
        if (!(sourceParams.provider in Source.#NewProviderCaseMap)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }

        if (source === null)
            // cache
            Cache.CacheSource = Source.#NewProviderCaseMap[sourceParams.provider](Cache.Schema, sourceParams)
        else
            // sources
            Source.Sources[source] = Source.#NewProviderCaseMap[sourceParams.provider](source, sourceParams)
    }

    static async ConnectAll(): Promise<void> {
        for (const _source in Config.Configuration.sources) {
            if (Object.hasOwn(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceParams = Config.Configuration.sources[_source]
                Source.Connect(_source, __sourceParams)
            }
        }
    }
    static async Disconnect(source: string): Promise<void> {
        if (source)
            Source.Sources[source].Disconnect()
    }

    static async DisconnectAll(): Promise<void> {
        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        _.keys(Source.Sources).forEach(Source.Disconnect)
    }

    static ResponseError(schemaResponse: TSchemaResponse): TSchemaResponseNoData {
        return <TSchemaResponseNoData>{
            ...schemaResponse,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }
    }
}
