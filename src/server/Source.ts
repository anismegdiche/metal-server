//
//
//
//
//
import { Logger } from '../utils/Logger'
import { Config } from './Config'
import { TConfigSource } from '../types/TConfig'
import { absDataProvider } from "../providers/absDataProvider"
import { DATA_PROVIDER, DataProvider } from "../providers/DataProvider"
import { HttpErrorLog } from "./HttpErrors"


//
export type TSource = {
    SourceConfig: TConfigSource
    DataProvider: absDataProvider
}


//
export class Source {

    // sources
    static Sources = new Map<string, TSource>() //NOSONAR

    static async Init(): Promise<void> {
        if (Config.Has('sources'))
            await Source.ConnectAll()
    }

    @Logger.LogFunction()
    static async Connect(source: string, sourceConfig: TConfigSource): Promise<void> {

        const { provider } = sourceConfig

        if (!Object.values(DATA_PROVIDER).includes(provider)) {
            Logger.Error(`Source '${source}', Provider '${provider}' not found. The source will not be connected`)
            return
        }
        try {
            Source.Sources.set(source, <TSource>{
                SourceConfig: sourceConfig,
                DataProvider: DataProvider.GetProvider(provider)
            })
            await Source.Sources.get(source)!.DataProvider.Init(source, sourceConfig)
            Source.Sources.get(source)!.DataProvider.Connect()
            
        } catch (error: any) {
            HttpErrorLog(error)
        }
    }

    @Logger.LogFunction()
    static async ConnectAll(): Promise<void> {
        for (const _source in Config.Configuration.sources) {
            if (Object.hasOwn(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceConfig = Config.Configuration.sources[_source]
                Source.Connect(_source, __sourceConfig)
            }
        }
    }
    @Logger.LogFunction()
    static async Disconnect(source: string): Promise<void> {
        if (source !== undefined && Source.Sources.has(source)) {
            await Source.Sources.get(source)!.DataProvider.Disconnect()
            Source.Sources.delete(source)
        }
    }

    @Logger.LogFunction()
    static async DisconnectAll(): Promise<void> {
        Source.Sources.forEach(async (_dataProvider, source) => await Source.Disconnect(source))
    }
}
