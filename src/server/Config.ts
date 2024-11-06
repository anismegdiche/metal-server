//
//
//
//
//
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'   //TODO: Use only one YAML lib
import * as dotenv from 'dotenv'
import _ from 'lodash'
import typia from "typia"
//
import { TJson } from '../types/TJson'
import { Logger, DefaultLevel } from '../utils/Logger'
import { Schedule } from './Schedule'
import { Cache } from '../server/Cache'
import { Source } from './Source'
import { AiEngine } from './AiEngine'
import { Convert } from '../lib/Convert'
import { HTTP_STATUS_MESSAGE } from "../lib/Const"
import { LogLevelDesc } from "loglevel"
import { TConfig } from "../types/TConfig"
import { TypeHelper } from "../lib/TypeHelper"
import { HttpErrorBadRequest } from "./HttpErrors"
import { AuthProvider } from "../providers/AuthProvider"

export class Config {

    // global configuration
    static Configuration: TConfig
    static ConfigFilePath = './config/config.yml'

    static readonly DEFAULTS: TJson = {
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
        EnableCache: false,               // Enable/disable cache
        // @deprecated: to remove
        EnableAuthentication: false,      // Enable/disable authentication
        EnableResponseChunk: false,       // v0.3, Enable/disable response chunking
        ResponseLimit: 10 * 1024 * 1024   // v0.3, Response body size limit
    }

    @Logger.LogFunction()
    static async Init(): Promise<void> {
        // ENV
        dotenv.config()

        await Config.Validate(await Config.Load())

        this.InitLogging()
        this.InitAuthentication()
        await this.InitCache()
        this.InitResponse()


        /* eslint-disable @typescript-eslint/no-unused-expressions, no-unused-expressions */
        Config.Has('sources') && await Source.ConnectAll()
        Config.Has('ai-engines') && await AiEngine.Init()
        Config.Has('ai-engines') && await AiEngine.CreateAll()
        Config.Has('schedules') && Schedule.CreateAndStartAll()
        /* eslint-enable @typescript-eslint/no-unused-expressions, no-unused-expressions */
    }

    @Logger.LogFunction()
    static async Load(): Promise<TConfig> {
        const configFileRaw = Fs.readFileSync(this.ConfigFilePath, 'utf8')
        return await Yaml.load(configFileRaw) as TConfig
    }

    @Logger.LogFunction(Logger.Debug, true)
    static CheckRessourcesUsage(newConfig: TConfig): void {
        // TODO check for used sources and plans in config
        const sourceConfig = {
            type: "string",
            // eslint-disable-next-line you-dont-need-lodash-underscore/keys
            enum: _.keys(newConfig?.sources ?? [])
        }

        const planConfig = {
            type: "string",
            // eslint-disable-next-line you-dont-need-lodash-underscore/keys
            enum: _.keys(newConfig?.plans ?? [])
        }
    }

    @Logger.LogFunction(Logger.Debug, true)
    static async Validate(newConfig: TConfig): Promise<void> {
        TypeHelper.Validate(typia.validateEquals<TConfig>(newConfig), new HttpErrorBadRequest())
        Config.CheckRessourcesUsage(newConfig)
        Config.Configuration = newConfig
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

    @Logger.LogFunction()
    static Set<T>(path: string, value: T): void {
        _.set(Config.Configuration, path, value)
    }

    @Logger.LogFunction()
    static InitLogging(): void {
        const verbosity = Config.Get<LogLevelDesc>("server.verbosity") ?? DefaultLevel
        Logger.SetLevel(verbosity)
    }

    @Logger.LogFunction()
    static InitAuthentication(): void {
        Config.Flags.EnableAuthentication = Config.Has('server.authentication')
        AuthProvider.SetCurrent(Config.Get<string>('server.authentication'))
        if (Config.Flags.EnableAuthentication) {
            AuthProvider.Provider.Init()
        }
    }

    @Logger.LogFunction()
    static async InitCache(): Promise<void> {
        Config.Flags.EnableCache = Config.Has('server.cache')
        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        Config.Flags.EnableCache && await Cache.Connect()
    }

    @Logger.LogFunction()
    static InitResponse(): void {
        Config.Flags.ResponseLimit = Convert.HumainSizeToBytes(
            Config.Get("server.response-limit") ?? Config.DEFAULTS["server.response-limit"]
        )
        Config.Flags.EnableResponseChunk = Config.Get<boolean>('server.response-chunk')
        Logger.Debug(`Server Response Limit set to ${Config.Flags.ResponseLimit}`)
    }
}

