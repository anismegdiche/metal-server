//
//
//
import axios from 'axios'
//
import { clsClonable } from '../../../utils/base/clsClonable'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from '../../../utils/StringUtils'
import { SynchronizerManager } from '../../../utils/SynchronizerManager'
import { ConfigManager } from '../../core/ConfigManager'
import type { U_config_server_ai_engines } from '../../core/types/U_config_server'
import { AI_ENGINE } from '../@consts'
import type { TAiRunArguments, TAiRunOutput } from '../@types'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { IAiEngine } from './IAiEngine'


//
export abstract class absAiEngine extends clsClonable implements IAiEngine {
    abstract AiEngineName: AI_ENGINE
    InstanceName!: string
    InstanceApiUrl!: string
    InstanceConfig!: T_config_ai_engines_ai_engine
    InstanceCommonConfig!: U_config_server_ai_engines

    constructor() {
        super()
    }

    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
        this.InstanceName = aiName
        this.InstanceConfig = aiConfig
        this.InstanceCommonConfig = ConfigManager.Get<U_config_server_ai_engines>("server.ai-engines")
        this.InstanceApiUrl = StringUtils.Url(
            aiConfig.url || this.InstanceCommonConfig['engines-url'],
            this.InstanceName
        );
    }

    abstract Run(params: TAiRunArguments): Promise<TAiRunOutput>

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