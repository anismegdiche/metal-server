//
//
//
//
//
import { Logger } from '../utils/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { IDataProvider } from '../types/IDataProvider'
import { TConfigSource } from '../types/TConfig'
// Providers
import { PostgresDataProvider } from '../providers/data/PostgresDataProvider'
import { MongoDbDataProvider } from '../providers/data/MongoDbDataProvider'
import { SqlServerDataProvider } from '../providers/data/SqlServerDataProvider'
import { PlanDataProvider } from '../providers/data/PlanDataProvider'
import { FilesDataProvider } from '../providers/data/FilesDataProvider'
import { MemoryDataProvider } from '../providers/data/MemoryDataProvider'
import { MetalDataProvider } from '../providers/data/MetalDataProvider'
import _ from "lodash"
import { MySqlDataProvider } from "../providers/data/MySqlDataProvider"

//  config types
//

enum DATA_PROVIDER {
    METAL = "metal",
    PLAN = "plan",
    MEMORY = "memory",
    POSTGRES = "postgres",
    MONGODB = "mongodb",
    MSSQL = "mssql",
    FILES = "files",
    MYSQL = "mysql"
}

export default DATA_PROVIDER

//
//
export class Source {

    // global sources
    static Sources: Record<string, IDataProvider> = {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static #NewProviderCaseMap: Record<DATA_PROVIDER, Function> = {
        [DATA_PROVIDER.METAL]: (source: string, sourceParams: TConfigSource) => new MetalDataProvider(source, sourceParams),
        [DATA_PROVIDER.PLAN]: (source: string, sourceParams: TConfigSource) => new PlanDataProvider(source, sourceParams),
        [DATA_PROVIDER.MEMORY]: (source: string, sourceParams: TConfigSource) => new MemoryDataProvider(source, sourceParams),
        [DATA_PROVIDER.POSTGRES]: (source: string, sourceParams: TConfigSource) => new PostgresDataProvider(source, sourceParams),
        [DATA_PROVIDER.MONGODB]: (source: string, sourceParams: TConfigSource) => new MongoDbDataProvider(source, sourceParams),
        [DATA_PROVIDER.MSSQL]: (source: string, sourceParams: TConfigSource) => new SqlServerDataProvider(source, sourceParams),
        [DATA_PROVIDER.FILES]: (source: string, sourceParams: TConfigSource) => new FilesDataProvider(source, sourceParams),
        [DATA_PROVIDER.MYSQL]: (source: string, sourceParams: TConfigSource) => new MySqlDataProvider(source, sourceParams)
    }

    @Logger.LogFunction()
    static async Connect(source: string | null, sourceParams: TConfigSource): Promise<void> {
        if (!(sourceParams.provider in Source.#NewProviderCaseMap)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }
        try {
            if (source === null)
                // cache
                Cache.CacheSource = Source.#NewProviderCaseMap[sourceParams.provider](Cache.Schema, sourceParams)
            else
                // sources
                Source.Sources[source] = Source.#NewProviderCaseMap[sourceParams.provider](source, sourceParams)
        } catch (error: any) {
            Logger.Error(error.message)
        }
    }

    @Logger.LogFunction()
    static async ConnectAll(): Promise<void> {
        for (const _source in Config.Configuration.sources) {
            if (Object.hasOwn(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceParams = Config.Configuration.sources[_source]
                Source.Connect(_source, __sourceParams)
            }
        }
    }
    @Logger.LogFunction()
    static async Disconnect(source: string): Promise<void> {
        if (source)
            Source.Sources[source].Disconnect()
    }

    @Logger.LogFunction()
    static async DisconnectAll(): Promise<void> {
        // eslint-disable-next-line you-dont-need-lodash-underscore/keys
        _.keys(Source.Sources).forEach(Source.Disconnect)
    }
}
