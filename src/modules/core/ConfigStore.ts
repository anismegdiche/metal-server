//
//
//
import merge from 'lodash/merge'
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
            "response-limit": '10mb',
            "response-rate": {
                windowMs: 1 * 60 * 1000,
                max: 600,
                message: HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS
            },
            "response-chunk": false,
            "ai-engines": {
                params: undefined, //{ socketPath: '/var/run/docker.sock' }
                "engines-url": "http://localhost:5000",
                "timeout": 60_000, // v0.5
                "min-instance": 1, // v0.5
                "max-instance": 5, // v0.5
                "cpu-scale-up": 70, // v0.5
                "cpu-scale-down": 30, // v0.5
                "scale-interval": 15_000 // v0.5
            }
        }
    }

    Init(newConfig: TConfig) {
        this.Configuration = merge(
            this.Configuration,
            newConfig
        )
    }
}