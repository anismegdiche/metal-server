//
//
//
//
//
import { Logger } from '../utils/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { TConfigSource } from '../types/TConfig'
import { absDataProvider } from "../providers/absDataProvider"
import { DATA_PROVIDER, DataProvider } from "../providers/DataProvider"


//
export class Source {

    // sources
    static Sources = new Map<string, absDataProvider>()

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
