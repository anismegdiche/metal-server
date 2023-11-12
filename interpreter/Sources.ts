//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Postgres } from '../providers/Postgres'
import { MongoDb } from '../providers/MongoDb'
import { SqlServer } from '../providers/SqlServer'
import { Cache } from '../server/Cache'
import { Config } from '../server/Config'
import { IProvider } from '../types/IProvider'


const ConnectToSource: Record<string, Function> = {
    'postgres': (source: string, sourceConfig: any) => new Postgres(source, sourceConfig),
    'mongodb': (source: string, sourceConfig: any) => new MongoDb(source, sourceConfig),
    'mssql': (source: string, sourceConfig: any) => new SqlServer(source, sourceConfig)
}

export class Sources {

    // global sources
    public static Sources: Record<string, IProvider> = {}

    static async ConnectAll() {
        for (const _source in Config.Configuration.sources) {
            if (Object.prototype.hasOwnProperty.call(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceConfig = Config.Configuration.sources[_source]
                Sources.Connect(_source, __sourceConfig)
            }
        }
    }
    static async DisconnectAll() {
        for (const _source in Sources.Sources) {
            if (_source)
                Sources.Sources[_source].Disconnect()
        }        
    }

    static async Connect(source: string | null, sourceConfig: any) {
        if (sourceConfig.provider in ConnectToSource) {
            if (source === null) {
                // cache
                Cache.CacheSource = ConnectToSource[sourceConfig.provider](Cache.Schema, sourceConfig)
            } else {
                // sources
                Sources.Sources[source] = ConnectToSource[sourceConfig.provider](source, sourceConfig)
            }
        } else {
            Logger.Error(`Source '${source}', Provider '${sourceConfig.provider}' not found. The source will not be connected`)
        }
    }
}