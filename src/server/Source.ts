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
import { RESPONSE } from '../lib/Const'
import { TSchemaResponse, TSchemaResponseNoData } from '../types/TSchemaResponse'
// Providers
import { PostgresProvider } from '../providers/PostgresProvider'
import { MongoDbProvider } from '../providers/MongoDbProvider'
import { SqlServerProvider } from '../providers/SqlServerProvider'
import { PlanProvider } from '../providers/PlanProvider'
import { FilesProvider } from '../providers/FilesProvider'
//
//  config types
//
/* eslint-disable no-unused-vars */
enum PROVIDER {
    PLAN = "plan",
    POSTGRES = "postgres",
    MONGODB = "mongodb",
    MSSQL = "mssql",
    FILES = "files"
}
export default PROVIDER
/* eslint-enable no-unused-vars */
//
//
//
export class Source {

    // global sources
    static Sources: Record<string, IProvider> = {}

    static #ProviderCaseMap: Record<PROVIDER, Function> = {
        [PROVIDER.PLAN]: (source: string, sourceParams: TSourceParams) => new PlanProvider(source, sourceParams),
        [PROVIDER.POSTGRES]: (source: string, sourceParams: TSourceParams) => new PostgresProvider(source, sourceParams),
        [PROVIDER.MONGODB]: (source: string, sourceParams: TSourceParams) => new MongoDbProvider(source, sourceParams),
        [PROVIDER.MSSQL]: (source: string, sourceParams: TSourceParams) => new SqlServerProvider(source, sourceParams),
        [PROVIDER.FILES]: (source: string, sourceParams: TSourceParams) => new FilesProvider(source, sourceParams)
    }

    static async Connect(source: string | null, sourceParams: TSourceParams): Promise<void> {
        if (!(sourceParams.provider in Source.#ProviderCaseMap)) {
            Logger.Error(`Source '${source}', Provider '${sourceParams.provider}' not found. The source will not be connected`)
            return
        }

        if (source === null) {
            // cache
            Cache.CacheSource = Source.#ProviderCaseMap[sourceParams.provider](Cache.Schema, sourceParams)
        } else {
            // sources
            Source.Sources[source] = Source.#ProviderCaseMap[sourceParams.provider](source, sourceParams)
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
