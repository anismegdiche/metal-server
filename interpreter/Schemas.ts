//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { TDataRequest } from '../types/TDataRequest'
import { Sources } from './Sources'


export abstract class Schemas {
    static GetSource(schemaConfig: any, dataRequest: TDataRequest): string | undefined {

        // case entity
        if (schemaConfig?.entities  &&
            schemaConfig?.entities?.length > 0 &&
            Sources.Sources[schemaConfig.entities[dataRequest.entity].source]) {
            const _source = schemaConfig.entities[dataRequest.entity].source
            return _source
        }

        // case source
        if (schemaConfig?.source  &&
            Config.Configuration?.sources[schemaConfig.source]) {
            const _source = schemaConfig.source
            return _source
        }

        Logger.Warn(`Nothing todo in section 'schemas'`)
        return undefined
    }

    //ROADMAP
    // static Create(schemaName: string) {
    //     global.Schemas[schemaName] = new DataBase(schemaName)
    // }

    //ROADMAP
    // static CreateAll() {
    //     for (const _schemaName in Config.Configuration.schemas) {
    //         if (_schemaName )
    //             this.Create(_schemaName)
    //     }
    // }
}