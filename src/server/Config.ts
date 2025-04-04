//
//
//
//
//
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'
import _ from 'lodash'
import typia from "typia"
import * as dotenv from 'dotenv'
//
import { TJson } from '../types/TJson'
import { Logger } from '../utils/Logger'
import { HTTP_STATUS_MESSAGE } from "../lib/Const"
import { TConfig } from "../types/TConfig"
import { TypeHelper } from "../lib/TypeHelper"
import { ConfigFileError } from "./HttpErrors"
import { JsonHelper } from "../lib/JsonHelper"
import { AuthProvider } from "../providers/AuthProvider"
import { Convert } from "../lib/Convert"

export class Config {

    // global configuration
    //TODO create a single default config and merge it with _.merge
    static Configuration: TConfig
    static ConfigFilePath = './config/config.yml'
    static EnvFilePath = './config/.env'

    static readonly DEFAULT: Partial<TConfig> = {
        server: {
            port: 3000,
            timezone: 'UTC',
            verbosity: 'warn',
            authentication: AuthProvider?.DEFAULT,
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

    @Logger.LogFunction()
    static async Init(): Promise<void> {
        const configFileContent = await Config.Load()
        const newConfig = await Config.Validate(configFileContent)

        // Config.CheckRessourcesUsage(newConfig)
        Config.Configuration = _.merge(
            Config.DEFAULT,
            newConfig
        )
    }

    @Logger.LogFunction()
    static async Load(): Promise<TConfig> {
        dotenv.config({ path: Config.EnvFilePath })
        const configFileRaw = Fs.readFileSync(Config.ConfigFilePath, 'utf8')
        const configInterpol = configFileRaw.replace(/\$(?:{([^{}]*)})/g, (match, envVarName) => {
            return process.env[envVarName] ?? match
        })

        return await Yaml.load(configInterpol) as TConfig
    }

    // @Logger.LogFunction(Logger.Debug, true)
    // static CheckRessourcesUsage(newConfig: TConfig): void {
    //     // TODO check for used sources and plans in config
    //     const sourceConfig = {
    //         type: "string",

    //         enum: _.keys(newConfig?.sources ?? [])
    //     }

    //     const planConfig = {
    //         type: "string",

    //         enum: _.keys(newConfig?.plans ?? [])
    //     }
    // }

    @Logger.LogFunction(true)
    static async Validate(newConfig: TConfig): Promise<TConfig> {
        try {
            TypeHelper.Validate(typia.validateEquals<TConfig>(newConfig), new ConfigFileError("Configuration file errors found"))
            return newConfig
        } catch (error: any) {
            throw new Error(error.message)
        }
    }

    // static GetErrors(schemaErrors: any): string[] {
    //     return schemaErrors
    //         .filter((e: Error) => e.message.includes('is required') || e.message.includes('must be'))
    // }

    @Logger.LogFunction()
    static Has(path: string): boolean {
        return _.has(Config.Configuration, path)
    }

    @Logger.LogFunction()
    static Get<T>(path: string): T {
        return JsonHelper.Get<T>(Config.Configuration, path)
    }

    @Logger.LogFunction()
    static Set<T>(path: string, value: T): void {
        JsonHelper.Set(Config.Configuration, path, value)
    }

    @Logger.LogFunction()
    static Save(): void {
        const configFileRaw = Yaml.dump(Config.Configuration)
        Fs.writeFileSync(Config.ConfigFilePath, configFileRaw)
    }
}