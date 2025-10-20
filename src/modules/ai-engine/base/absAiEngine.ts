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
import { AI_ENGINE } from '../@consts'
import { TAiRunArguments, TAiRunOutput, TConfigAiEngine } from '../@types'
import { IAiEngine } from './IAiEngine'


//
export abstract class absAiEngine extends clsClonable implements IAiEngine {
    abstract AiEngineName: AI_ENGINE
    InstanceName!: string
    InstanceApiUrl!: string
    InstanceConfig!: TConfigAiEngine

    constructor() {
        super()
    }

    async Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void> {
        this.InstanceName = aiName
        this.InstanceConfig = aiConfig
        this.InstanceApiUrl = StringUtils.Url(
            aiConfig.url || ConfigManager.Get<string>("server.ai-engines.engines-url"),
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

        Logger.Info(`${Logger.Out} '${this.InstanceName}': Health check at ${_url}, ${_isHealthy
            ? 'Ok 🟢'
            : 'Ko 🔴'}`)

        return _isHealthy
    }
}