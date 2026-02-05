//
//
//
import axios, { type AxiosResponse } from 'axios'
//
import { clsClonable } from '../../../utils/base/clsClonable'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from '../../../utils/StringUtils'
import { SynchronizerManager } from '../../../utils/SynchronizerManager'
import { Utils } from "../../../utils/Utils"
import { ConfigManager } from '../../core/ConfigManager'
import type { U_config_server_ai_engines } from '../../core/types/U_config_server'
import { AI_ENGINE } from '../@consts'
import type { TAiArguments, TAiOutput } from '../@types'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { TAiDockerService } from "../types/TAiDockerService"
import type { IAiEngine } from './IAiEngine'
import type { TJson } from "../../../types/TJson"
import { NormalizeError } from '../../errors/HttpErrors'


//
const IMAGE_DEFAULT_HEADERS = {
    headers: {
        'Content-Type': 'application/json'
    }
}


//
export abstract class absAiEngine extends clsClonable implements IAiEngine {
    abstract AiEngineName: AI_ENGINE
    InstanceName!: string
    InstanceApiUrl!: string
    InstanceConfig!: T_config_ai_engines_ai_engine
    InstanceCommonConfig!: U_config_server_ai_engines
    abstract AiDockerService: Record<string, TAiDockerService>
    abstract RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>>

    constructor() {
        super()
    }

    async _postData(data: string | TJson, params?: TJson): Promise<AxiosResponse> {

        const _url = StringUtils.Url(this.InstanceApiUrl, 'run')
        while (true) {
            try {
                return await axios.post(
                    _url,
                    {
                        input_data: data,
                        params
                    },
                    IMAGE_DEFAULT_HEADERS
                )
            } catch (err: unknown) {
                const _err = NormalizeError(err)
                if (_err.response?.status === 429) {
                    Logger.Info(`${this.InstanceName} processing is busy, retrying`)
                } else {
                    Logger.Warn(`${this.InstanceName} processing failed: ${_err.response.data.message ?? _err.message}`)
                }
                await Utils.Sleep(200)
            }
        }
    }

    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
        this.InstanceName = aiName
        this.InstanceConfig = aiConfig
        this.InstanceCommonConfig = ConfigManager.Get<U_config_server_ai_engines>("server.ai-engines")
        this.InstanceApiUrl = StringUtils.Url(
            aiConfig.url || this.InstanceCommonConfig['engines-url'],
            this.InstanceName
        )
    }

    abstract Run(params: TAiArguments): Promise<TAiOutput>

    abstract Prepare(): Promise<void>

    @SynchronizerManager.Synchronized()
    async IsHealthy(): Promise<boolean> {
        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            'health'
        )

        const _isHealthy = await axios.get(_url)
            .then(response => response.status === 200)
            .catch(() => false)

        Logger.Info(`${Logger.Out} '${this.InstanceName}': ${_isHealthy ? '🟢' : '🔴'} Health check at ${_url}, ${_isHealthy ? 'Ok' : 'Ko'}`)

        return _isHealthy
    }
}