//
//
//
//
//
import { Logger } from '../utils/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { TConfigSource } from '../types/TConfig'
// Providers
import { absDataProvider } from "../providers/absDataProvider"
import { DataProvider } from "../providers/DataProvider"


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
export class Source {

    // global sources
    static Sources = new Map<string, absDataProvider>()

    //XXX // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    //XXX static #NewProviderCaseMap: Record<DATA_PROVIDER, Function> = {
    //XXX     [DATA_PROVIDER.METAL]: (source: string, sourceParams: TConfigSource) => new MetalData(source, sourceParams),
    //XXX     [DATA_PROVIDER.PLAN]: (source: string, sourceParams: TConfigSource) => new PlanData(source, sourceParams),
    //XXX     [DATA_PROVIDER.MEMORY]: (source: string, sourceParams: TConfigSource) => new MemoryData(source, sourceParams),
    //XXX     [DATA_PROVIDER.POSTGRES]: (source: string, sourceParams: TConfigSource) => new PostgresData(source, sourceParams),
    //XXX     [DATA_PROVIDER.MONGODB]: (source: string, sourceParams: TConfigSource) => new MongoDbData(source, sourceParams),
    //XXX     [DATA_PROVIDER.MSSQL]: (source: string, sourceParams: TConfigSource) => new SqlServerData(source, sourceParams),
    //XXX     [DATA_PROVIDER.FILES]: (source: string, sourceParams: TConfigSource) => new FilesData(source, sourceParams),
    //XXX     [DATA_PROVIDER.MYSQL]: (source: string, sourceParams: TConfigSource) => new MySqlData(source, sourceParams)
    //XXX }

    @Logger.LogFunction()
    static async Connect(source: string | null, sourceParams: TConfigSource): Promise<void> {
        if (!Object.values(DATA_PROVIDER).includes(sourceParams.provider)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }
        try {
            if (source === null) {
                // cache
                Cache.CacheSource = DataProvider.GetProvider(sourceParams.provider)
                Cache.CacheSource.Init(Cache.Schema, sourceParams)
                Cache.CacheSource.Connect()
            } else {
                // sources
                Source.Sources.set(source, DataProvider.GetProvider(sourceParams.provider))
                Source.Sources.get(source)!.Init(source, sourceParams)
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
