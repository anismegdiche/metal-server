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
const yamlValidate = require('yaml-schema-validator')

import * as SCHConfig from '../types/SCHConfig'
import { Source } from './Source'
import { Logger, DefaultLevel } from '../lib/Logger'
import { Schedule } from './Schedule'
import { Cache } from '../server/Cache'
import { TJson } from '../types/TJson'
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

    static async Init() {
        Logger.Info('Config.Init')
        // ENV
        dotenv.config()

        Config.Load()
        Config.Check()

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
        this.CheckRoot()
        this.CheckSources()
        this.CheckSchemas()
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

    static async CheckRoot() {
        const schemaErrors = yamlValidate(
            _.cloneDeep(Config.Configuration), {
            schema: SCHConfig.SCHConfigRoot,
            logLevel: 'error'
        })
        const errors: string[] = _.filter(schemaErrors, (e) => e.message.includes('is required'))
        if (errors.length > 0) {
            Logger.Error(`Errors have been detected in configuration file: ${this.ConfigFilePath}`)
            process.exit(1)
        }
        // check cache configuration
        if (Config.Has("server.cache"))
            Config.Flags.EnableCache = true
        else
            Logger.Warn("section 'server.cache' is not configured, Metal will start without cache feature")
    }

    static async CheckSources() {
        _.forEach(_.cloneDeep(Config.Configuration.sources), (_source: any, _key: any) => {
            const _schemaErrors = yamlValidate(_source, {
                schema: SCHConfig.SCHConfigSource,
                logLevel: 'error'
            })
            const _errors: string[] = this.GetErrors(_schemaErrors)
            if (_errors.length > 0) {
                Logger.Error(`Errors have been detected in section 'sources.${_key}', configuration file: ${this.ConfigFilePath}`)
                process.exit(1)
            }
        })
    }

    static async CheckSchemas() {
        _.forEach(_.cloneDeep(Config.Configuration.schemas), (_schema: any, _key: any) => {
            const _schemaErrors = yamlValidate(_schema, {
                schema: SCHConfig.SCHConfigSchema,
                logLevel: 'error'
            })
            const _errors: string[] = this.GetErrors(_schemaErrors)
            if (_errors.length > 0) {
                Logger.Error(`Errors have been detected in section 'schema.${_key}', configuration file: ${this.ConfigFilePath}`)
                process.exit(1)
            }
        })
    }
}