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
import { Validator } from 'jsonschema'
//
import { Logger, DefaultLevel } from '../lib/Logger'
import { TJson } from '../types/TJson'
import { Source } from './Source'
import { Schedule } from './Schedule'
import { Cache } from '../server/Cache'
import { User } from './User'
import { AiEngine } from './AiEngine'


export class Config {

    // global configuration
    public static Configuration: any = {}
    public static ConfigFilePath = './config/config.yml'

    public static DEFAULTS: TJson = {
        "server.port": 3000,
        "server.timezone": 'UTC',
        "server.verbosity": 'warn',
        "server.request-limit": '100mb'
    }

    public static Flags: TJson = {
        EnableCache: false,              // enable/disable cache
        EnableAuthentication: false      // enable/disable authentication
    }

    static #Schemas: any = {
        id: "/",
        type: "object",
        properties: {
            "version": {
                type: "string",
                enum: ["0.1"]
            },
            "server": {
                type: "object",
                properties: {
                    "port": {
                        type: "integer",
                        minimum: 1,
                        maximum: 65535
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
                                enum: ["plan", "postgres", "mongodb", "mssql"]
                            },
                            "host": { type: "string" },
                            "port": {
                                type: "integer",
                                minimum: 1,
                                maximum: 65535
                            },
                            "user": { type: "string" },
                            "password": { type: "string" },
                            "database": { type: "string" }
                        },
                        required: ["provider", "database"]
                    }
                }
            },
            "schemas": {
                type: "object",
                patternProperties: {
                    ".*": {
                        type: "object",
                        properties: {
                            "source": { type: "string" },
                            "entities": {
                                type: "object",
                                patternProperties: {
                                    ".*": {
                                        type: "object",
                                        properties: {
                                            "source": { type: "string" },
                                            "entity": { type: "string" }
                                        }
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
                                enum: ["tesseractjs", "tensorflowjs", "nlpjs"]
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
                        dependencies: {
                            "engine": ["model"]
                        }
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
                            "plan": { type: "string" },
                            "entity": { type: "string" },
                            "cron": { type: "string" }
                        },
                        required: ["plan", "entity", "cron"]
                    }
                }
            }
        }
    }

    static async Init() {
        Logger.Info('Config.Init')
        // ENV
        dotenv.config()

        await Config.Load()
        await Config.Check()

        const verbosity = (Config.Configuration.server?.verbosity ?? DefaultLevel).toLowerCase()

        Logger.SetLevel(verbosity)

        Config.Flags.EnableAuthentication = Config.Has('server.authentication')
        Config.Flags.EnableAuthentication && User.LoadUsers()
        Config.Has('sources') && await Source.ConnectAll()
        Config.Has('server.cache') && await Cache.Connect()
        Config.Has('ai-engines') && await AiEngine.Init()
        Config.Has('ai-engines') && await AiEngine.CreateAll()
        Config.Has('schedules') && Schedule.CreateAndStartAll()
    }

    static async Load() {
        Logger.Debug('Config.Load')
        const configFileRaw = Fs.readFileSync(this.ConfigFilePath, 'utf-8')
        Config.Configuration = Yaml.load(configFileRaw)
    }

    static async Check() {
        Logger.Debug('Config.Check')
        const v = new Validator()

        const errors = v.validate(this.Configuration, this.#Schemas).errors

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
    public static Has(element: string): boolean {
        return _.has(Config.Configuration, element)
    }

    public static Get<T>(element: string): T {
        return _.get(Config.Configuration, element)
    }


}