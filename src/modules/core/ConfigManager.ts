//
//
//
import * as Fs from 'fs'
import * as Yaml from 'js-yaml'
import typia from "typia"
import * as dotenv from 'dotenv'
import _ from 'lodash'
//
import { Logger } from '../../utils/Logger'
import { TConfig } from "./types/TConfig"
import { TypeUtils } from "../../utils/TypeUtils"
import { ConfigFileError } from "../errors/HttpErrors"
import { JsonUtils } from '../../utils/JsonUtils'
import { IConfigStore } from './base/IConfigStore'
import { Assert } from '../../utils/Assert'


//
export class ConfigManager {

    static ConfigFilePath = './config/config.yml'
    static EnvFilePath = './config/.env'
    static configStore?: IConfigStore

    @Logger.LogFunction()
    static async Init(configStore: IConfigStore): Promise<void> {
        const configFileContent = await ConfigManager.Load()
        const newConfig = await ConfigManager.Validate(configFileContent)
        // Config.CheckRessourcesUsage(newConfig)
        if (!ConfigManager.configStore)
            ConfigManager.configStore = configStore

        ConfigManager.configStore.Init(newConfig)
    }

    @Logger.LogFunction()
    static async Load(): Promise<TConfig> {
        dotenv.config({ path: ConfigManager.EnvFilePath })
        const configFileRaw = Fs.readFileSync(ConfigManager.ConfigFilePath, 'utf8')
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
            TypeUtils.Validate(typia.validateEquals<TConfig>(newConfig), new ConfigFileError("Configuration file errors found"))
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
    static Save(): void {
        Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
        const configFileRaw = Yaml.dump(ConfigManager.configStore.Configuration)
        Fs.writeFileSync(ConfigManager.ConfigFilePath, configFileRaw)
    }

    @Logger.LogFunction()
    static Has(path: string): boolean {
        Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
        return _.has(ConfigManager.configStore.Configuration, path)
    }

    @Logger.LogFunction()
    static Get<T>(path: string): T {
        Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
        return JsonUtils.Get<T>(ConfigManager.configStore.Configuration, path)
    }

    @Logger.LogFunction()
    static Set<T>(path: string, value: T): void {
        Assert.Var<IConfigStore>(ConfigManager.configStore, "ConfigStore is not initialized")
        JsonUtils.Set(ConfigManager.configStore.Configuration, path, value)
    }
}