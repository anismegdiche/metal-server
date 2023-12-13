//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { IProvider } from '../types/IProvider'
// Providers
import { Postgres } from '../providers/Postgres'
import { MongoDb } from '../providers/MongoDb'
import { SqlServer } from '../providers/SqlServer'
import { PlanProvider } from '../providers/PlanProvider'


const NewSourceCaseMap: Record<string, Function> = {
    'plan': (source: string, sourceConfig: any) => new PlanProvider(source, sourceConfig),
    'postgres': (source: string, sourceConfig: any) => new Postgres(source, sourceConfig),
    'mongodb': (source: string, sourceConfig: any) => new MongoDb(source, sourceConfig),
    'mssql': (source: string, sourceConfig: any) => new SqlServer(source, sourceConfig)
}

export class Source {

    // global sources
    public static Sources: Record<string, IProvider> = {}

    static async Connect(source: string | null, sourceConfig: any) {
        if (sourceConfig.provider in NewSourceCaseMap) {
            if (source === null) {
                // cache
                Cache.CacheSource = NewSourceCaseMap[sourceConfig.provider](Cache.Schema, sourceConfig)
            } else {
                // sources
                Source.Sources[source] = NewSourceCaseMap[sourceConfig.provider](source, sourceConfig)
            }
        } else {
            Logger.Error(`Source '${source}', Provider '${sourceConfig.provider}' not found. The source will not be connected`)
        }
    }

    static async ConnectAll() {
        for (const _source in Config.Configuration.sources) {
            if (Object.prototype.hasOwnProperty.call(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceConfig = Config.Configuration.sources[_source]
                Source.Connect(_source, __sourceConfig)
            }
        }
    }
    static async DisconnectAll() {
        for (const _source in Source.Sources) {
            if (_source)
                Source.Sources[_source].Disconnect()
        }
    }


}