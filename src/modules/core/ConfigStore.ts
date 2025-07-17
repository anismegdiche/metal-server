//
//
//
import _ from 'lodash'
//
import { LoggerDefaultLevel } from '../../utils/Logger'
import { AUTH_PROVIDER } from "../auth/@consts"
import { HTTP_STATUS_MESSAGE } from "./@consts"
import { IConfigStore } from './base/IConfigStore'
import { TConfig } from "./types/TConfig"


//
export class ConfigStore implements IConfigStore {

    // global configuration
    //TODO create a single default config and merge it with _.merge
    Configuration: TConfig = <TConfig>{
        server: {
            port: 3000,
            timezone: 'UTC',
            verbosity: LoggerDefaultLevel,
            authentication: {
                provider: AUTH_PROVIDER.LOCAL
            },
            "request-limit": '10mb',
            "response-limit": '10mb',     // v0.3
            "response-chunk": false,      // v0.3
            "response-rate": {            // v0.3
                windowMs: 1 * 60 * 1000,
                max: 600,
                message: HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS 
            }
        }
    }

    Init(newConfig: TConfig) {
        this.Configuration = _.merge(
            this.Configuration,
            newConfig
        )
    }
}