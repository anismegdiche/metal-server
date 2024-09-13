//
//
//
//
//
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'
import * as dotenv from 'dotenv'
import _ from 'lodash'
//
import { TJson } from '../types/TJson'
import { Logger, DefaultLevel } from '../utils/Logger'
import { Schedule } from './Schedule'
import { Cache } from '../server/Cache'
import { User } from './User'
import { Source } from './Source'
import { AiEngine } from './AiEngine'
import { JsonHelper } from '../lib/JsonHelper'
import { Convert } from '../lib/Convert'
import { HTTP_STATUS_MESSAGE } from "../lib/Const"
import { LogLevelDesc } from "loglevel"
import { ConfigSchema } from "../schemas/Config.schema"

export class Config {

    // global configuration
    static Configuration: any = {}
    static ConfigFilePath = './config/config.yml'

    static DEFAULTS: TJson = {
        "server.port": 3000,
        "server.timezone": 'UTC',
        "server.verbosity": 'warn',
        "server.request-limit": '10mb',
        // v0.3
        "server.response-limit": '10mb',
        // v0.3
        "server.response-chunk": false,
        // v0.3
        "server.response-rate": {
            windowMs: 1 * 60 * 1000,
            max: 600,
            message: HTTP_STATUS_MESSAGE.TOO_MANY_REQUESTS
        }
    }

    static Flags: TJson = {
        EnableCache: false,              // enable/disable cache
        EnableAuthentication: false,     // enable/disable authentication
        // v0.3
        EnableResponseChunk: false,      // enable/disable response chunking
        // v0.3
        ResponseLimit: 10 * 1024 * 1024   // response body size limit
    }

    static #ConfigSchema = ConfigSchema

    @Logger.LogFunction()
    static async Init(): Promise<void> {
        // ENV
        dotenv.config()

        await Config.Load()
        await Config.Validate()

        const verbosity = Config.Get<LogLevelDesc>("server.verbosity") ?? DefaultLevel

        Logger.SetLevel(verbosity)
        // set flags
        Config.Flags.EnableAuthentication = Config.Has('server.authentication')
        Config.Flags.EnableCache = Config.Has('server.cache')
        Config.Flags.ResponseLimit = Convert.HumainSizeToBytes(
            Config.Get("server.response-limit") ?? Config.DEFAULTS["server.response-limit"]
        )
        Config.Flags.EnableResponseChunk = Boolean(Config.Get('server.response-chunk'))

        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        Config.Flags.EnableAuthentication && User.LoadUsers()
        // add response-limit
        Logger.Debug(`Server Response Limit set to ${Config.Flags.ResponseLimit}`)
        /* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
        Config.Flags.EnableCache && await Cache.Connect()
        Config.Has('sources') && await Source.ConnectAll()
        Config.Has('ai-engines') && await AiEngine.Init()
        Config.Has('ai-engines') && await AiEngine.CreateAll()
        Config.Has('schedules') && Schedule.CreateAndStartAll()
        /* eslint-enable @typescript-eslint/no-unused-expressions, no-unused-expressions */
    }

    @Logger.LogFunction()
    static async Load(): Promise<void> {
        const configFileRaw = Fs.readFileSync(this.ConfigFilePath, 'utf8')
        Config.Configuration = await Yaml.load(configFileRaw)
        Config.ExtendSchema()
    }

    @Logger.LogFunction()
    static ExtendSchema(): void {
        const sourceNameConfig = {
            type: "string",
            // eslint-disable-next-line you-dont-need-lodash-underscore/keys
            enum: _.keys(Config.Configuration?.sources ?? [])
        }

        Config.#ConfigSchema.properties.schemas.patternProperties[".*"].properties.sourceName = sourceNameConfig
        Config.#ConfigSchema.properties.schemas.patternProperties[".*"].properties.entities.patternProperties[".*"].properties.sourceName = sourceNameConfig

        const planNameConfig = {
            type: "string",
            // eslint-disable-next-line you-dont-need-lodash-underscore/keys
            enum: _.keys(Config.Configuration?.plans ?? [])
        }

        Config.#ConfigSchema.properties.schedules.patternProperties[".*"].properties.planName = planNameConfig
    }

    @Logger.LogFunction()
    static async Validate(): Promise<void> {
        const { errors } = JsonHelper.Validator.validate(this.Configuration, this.#ConfigSchema)

        if (errors.length <= 0)
            return

        Logger.Error(`Errors have been detected in configuration file ${this.ConfigFilePath}:\n\n - ${errors.join('\n - ').replace(/instance\./mg, '')}\n`)
        process.exit(1)
    }

    @Logger.LogFunction()
    static GetErrors(schemaErrors: any): string[] {
        return schemaErrors
            .filter((e: Error) => e.message.includes('is required') || e.message.includes('must be'))
    }
    @Logger.LogFunction()
    static Has(path: string): boolean {
        return _.has(Config.Configuration, path)
    }

    @Logger.LogFunction()
    static Get<T>(path: string, defaultValue: any = undefined): T {
        // eslint-disable-next-line you-dont-need-lodash-underscore/get
        return _.get(Config.Configuration, path, defaultValue)
    }
}

