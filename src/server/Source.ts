//
//
//
//
import _ from "lodash"
//
import { Logger } from '../utils/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { IData } from '../types/IData'
import { TConfigSource } from '../types/TConfig'
// Providers
import { PostgresData } from '../providers/data/PostgresData'
import { MongoDbData } from '../providers/data/MongoDbData'
import { SqlServerData } from '../providers/data/SqlServerData'
import { PlanData } from '../providers/data/PlanData'
import { FilesData } from '../providers/data/FilesData'
import { MemoryData } from '../providers/data/MemoryData'
import { MetalData } from '../providers/data/MetalData'
import { MySqlData } from "../providers/data/MySqlData"

//  config types
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

//XXX export default DATA_PROVIDER

//
//
export class Source {

    // global sources
    static Sources = new Map<string, IData>()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static #NewProviderCaseMap: Record<DATA_PROVIDER, Function> = {
        [DATA_PROVIDER.METAL]: (source: string, sourceParams: TConfigSource) => new MetalData(source, sourceParams),
        [DATA_PROVIDER.PLAN]: (source: string, sourceParams: TConfigSource) => new PlanData(source, sourceParams),
        [DATA_PROVIDER.MEMORY]: (source: string, sourceParams: TConfigSource) => new MemoryData(source, sourceParams),
        [DATA_PROVIDER.POSTGRES]: (source: string, sourceParams: TConfigSource) => new PostgresData(source, sourceParams),
        [DATA_PROVIDER.MONGODB]: (source: string, sourceParams: TConfigSource) => new MongoDbData(source, sourceParams),
        [DATA_PROVIDER.MSSQL]: (source: string, sourceParams: TConfigSource) => new SqlServerData(source, sourceParams),
        [DATA_PROVIDER.FILES]: (source: string, sourceParams: TConfigSource) => new FilesData(source, sourceParams),
        [DATA_PROVIDER.MYSQL]: (source: string, sourceParams: TConfigSource) => new MySqlData(source, sourceParams)
    }

    @Logger.LogFunction()
    static async Connect(source: string | null, sourceParams: TConfigSource): Promise<void> {
        if (!(sourceParams.provider in Source.#NewProviderCaseMap)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }
        try {
            if (source === null) {
                // cache
                Cache.CacheSource = Source.#NewProviderCaseMap[sourceParams.provider](Cache.Schema, sourceParams)
                Cache.CacheSource.Init()
                Cache.CacheSource.Connect()
            } else {
                // sources
                Source.Sources.set(source, Source.#NewProviderCaseMap[sourceParams.provider](source, sourceParams))
                Source.Sources.get(source)!.Init()
                Source.Sources.get(source)!.Connect()
            }
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
        if (source !== undefined && Source.Sources.has(source)) {
            await Source.Sources.get(source)!.Disconnect()
            Source.Sources.delete(source)
        }
    }

    @Logger.LogFunction()
    static async DisconnectAll(): Promise<void> {
        Source.Sources.forEach(async (_dataProvider, source) => await Source.Disconnect(source))
    }
}
