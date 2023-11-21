//
//
//
//
//
import _ from 'lodash'
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { TDataRequest } from '../types/TDataRequest'
import { Sources } from './Sources'


export abstract class Schemas {
    static GetSource(schemaConfig: any, dataRequest: TDataRequest): string | undefined {
        
        //case entities
        const entitySource = _.get(schemaConfig, `entities[${dataRequest.entity}].source`);
        if (!_.isEmpty(entitySource) && Sources.Sources[entitySource]) {
            return entitySource;
        }

        // case source
        const schemaSource = schemaConfig?.source;
        if (schemaSource && Config.Configuration?.sources[schemaSource]) {
            return schemaSource;
        }

        Logger.Warn(`Nothing to do in the 'schemas' section`);
        return undefined;
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