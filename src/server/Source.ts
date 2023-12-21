//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Cache } from './Cache'
import { Config } from './Config'
import { IProvider } from '../types/IProvider'
import { TSourceParams } from '../types/TSourceParams'
// Providers
import { Postgres } from '../providers/Postgres'
import { MongoDb } from '../providers/MongoDb'
import { SqlServer } from '../providers/SqlServer'
import { PlanProvider } from '../providers/PlanProvider'
import { RESPONSE } from '../lib/Const'
import { TSchemaResponse, TSchemaResponseNoData } from '../types/TSchemaResponse'


const NewSourceCaseMap: Record<string, Function> = {
    'plan': (source: string, sourceParams: TSourceParams) => new PlanProvider(source, sourceParams),
    'postgres': (source: string, sourceParams: TSourceParams) => new Postgres(source, sourceParams),
    'mongodb': (source: string, sourceParams: TSourceParams) => new MongoDb(source, sourceParams),
    'mssql': (source: string, sourceParams: TSourceParams) => new SqlServer(source, sourceParams)
}

export class Source {

    // global sources
    public static Sources: Record<string, IProvider> = {}

    static async Connect(source: string | null, sourceParams: TSourceParams): Promise<void> {
        if (!(sourceParams.provider in NewSourceCaseMap)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }

        if (source === null) {
            // cache
            Cache.CacheSource = NewSourceCaseMap[sourceParams.provider](Cache.Schema, sourceParams)
        } else {
            // sources
            Source.Sources[source] = NewSourceCaseMap[sourceParams.provider](source, sourceParams)
        }
    }

    static async ConnectAll(): Promise<void> {
        for (const _source in Config.Configuration.sources) {
            if (Object.prototype.hasOwnProperty.call(Config.Configuration.sources, _source)) {
                Logger.Info(`${Logger.Out} found source '${_source}'`)
                const __sourceParams = Config.Configuration.sources[_source]
                Source.Connect(_source, __sourceParams)
            }
        }
    }
    static async Disconnect(source: string): Promise<void> {
        Source.Sources[source].Disconnect()
    }

    static async DisconnectAll(): Promise<void> {
        for (const _source in Source.Sources) {
            if (_source)
                Source.Disconnect(_source)
        }
    }

    static ResponseError(schemaResponse: TSchemaResponse): TSchemaResponseNoData {
        return <TSchemaResponseNoData>{
            ...schemaResponse,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.MESSAGE,
            ...RESPONSE.SERVER.INTERNAL_SERVER_ERROR.STATUS
        }        
    }
}