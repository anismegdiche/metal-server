/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-var-requires */
//
//
//
//
//
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'
import _ from 'lodash'
import * as dotenv from 'dotenv'
//
import { TJson } from '../types/TJson'
import { Logger, DefaultLevel } from '../lib/Logger'
import { Schedule } from './Schedule'
import { Cache } from '../server/Cache'
import { User } from './User'
import DATA_PROVIDER, { Source } from './Source'
import { AI_ENGINE, AiEngine } from './AiEngine'
import { Helper } from '../lib/Helper'

export class Config {

    // global configuration
    static Configuration: any = {}
    static ConfigFilePath = './config/config.yml'

    static DEFAULTS: TJson = {
        "server.port": 3000,
        "server.timezone": 'UTC',
        "server.verbosity": 'warn',
        "server.request-limit": '100mb'
    }

    static Flags: TJson = {
        EnableCache: false,              // enable/disable cache
        EnableAuthentication: false      // enable/disable authentication
    }

    static #ConfigSchema: any = {
        id: "/",
        type: "object",
        properties: {
            "version": {
                type: "string",
                enum: ["0.1", "0.2"]
            },
            "server": {
                type: "object",
                properties: {
                    "port": {
                        type: "integer",
                        minimum: 1,
                        maximum: 65_535
                    },
                    "verbosity": {
                        type: "string",
                        enum: ["debug", "info", "warn", "error", "trace"]
                    },
                    "timezone": { type: "string" },
                    "authentication": { type: "null" },
                    "request-limit": { type: "string" },
                    "cache": { type: "object" }
                }
            },
            "users": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: ["string", "number"]
                    }
                }
            },
            "sources": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: "object",
                        properties: {
                            "provider": {
                                type: "string",
                                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                                enum: _.values(DATA_PROVIDER)
                            },
                            "host": { type: "string" },
                            "port": {
                                type: "integer",
                                minimum: 1,
                                maximum: 65_535
                            },
                            "user": { type: "string" },
                            "password": { type: "string" },
                            "database": { type: "string" }
                        },
                        required: ["provider"]
                    }
                }
            },
            "schemas": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: "object",
                        properties: {
                            "sourceName": { type: "string" },
                            "entities": {
                                type: "object",
                                patternProperties: {
                                    ".*": {
                                        type: "object",
                                        properties: {
                                            "sourceName": { type: "string" },
                                            "entityName": { type: "string" }
                                        },
                                        required: ["sourceName", "entityName"]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "ai-engines": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: "object",
                        properties: {
                            "engine": {
                                type: "string",
                                // eslint-disable-next-line you-dont-need-lodash-underscore/values
                                enum: _.values(AI_ENGINE)
                            },
                            "model": { type: "string" },
                            "options": {
                                type: "object",
                                patternProperties: {
                                    ".*": {
                                        type: "any"
                                    }
                                }
                            }
                        },
                        required: ["engine", "model"]
                    }
                }
            },
            "plans": {
                type: "object",
                patternProperties: {
                    // planName
                    ".*": {
                        type: "object",
                        patternProperties: {
                            // entityName
                            ".*": {
                                type: "array",
                                items: {
                                    // step
                                    type: "object",
                                    patternProperties: {
                                        ".*": {
                                            type: "any"
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "schedules": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: "object",
                        properties: {
                            "planName": { type: "string" },
                            "entityName": { type: "string" },
                            "cron": {
                                type: "string",
                                pattern: "(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\\d+(ns|us|µs|ms|s|m|h))+)|((((\\d+,)+\\d+|([\\d\\*]+(\\/|-)\\d+)|\\d+|\\*) ?){5,7})"
                            }
                        },
                        required: ["planName", "entityName", "cron"]
                    }
                }
            }
        }
    }

    static async Init(): Promise<void> {
        Logger.Info('Config.Init')
        // ENV
        dotenv.config()

        await Config.Load()
        await Config.Validate()

        const verbosity = (Config.Configuration.server?.verbosity ?? DefaultLevel).toLowerCase()

        Logger.SetLevel(verbosity)

        Config.Flags.EnableAuthentication = Config.Has('server.authentication')
        Config.Flags.EnableAuthentication && User.LoadUsers()
        Config.Flags.EnableCache = Config.Has('server.cache')
        Config.Flags.EnableCache && await Cache.Connect()
        Config.Has('sources') && await Source.ConnectAll()
        Config.Has('ai-engines') && await AiEngine.Init()
        Config.Has('ai-engines') && await AiEngine.CreateAll()
        Config.Has('schedules') && Schedule.CreateAndStartAll()
    }

    static async Load(): Promise<void> {
        Logger.Debug('Config.Load')
        const configFileRaw = Fs.readFileSync(this.ConfigFilePath, 'utf8')
        Config.Configuration = Yaml.load(configFileRaw)
    }

    static async Validate(): Promise<void> {
        Logger.Debug('Config.Validate')
        const { errors } = Helper.JsonValidator.validate(this.Configuration, this.#ConfigSchema)

        if (errors.length <= 0) {
            return
        }

        Logger.Error(`Errors have been detected in configuration file: ${this.ConfigFilePath}`)
        errors.forEach((i) => {
            Logger.Error(i.stack.replace(/instance\./, ''))
        })
        process.exit(1)
    }

    static GetErrors(schemaErrors: any): string[] {
        return _.filter(
            schemaErrors,
            (e) => e.message.includes('is required') || e.message.includes('must be')
        )
    }
    static Has(path: string): boolean {
        return _.has(Config.Configuration, path)
    }

    static Get<T>(path: string): T {
        return _.get(Config.Configuration, path, undefined)
    }
}

