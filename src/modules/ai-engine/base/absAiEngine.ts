

import axios from 'axios'
import { clsClonable } from '../../../utils/base/clsClonable'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from '../../../utils/StringUtils'
import { AI_ENGINE } from '../@consts'
import { TAiRunOutput, TAiRunArguments, TConfigAiEngine } from '../@types'
import { IAiEngine } from './IAiEngine'

export abstract class absAiEngine extends clsClonable implements IAiEngine {
    abstract AiEngineName: AI_ENGINE
    abstract InstanceName: string
    abstract InstanceApiUrl: string
    abstract InstanceConfig: TConfigAiEngine | null

    constructor() {
        super()
    }

    abstract Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void | null>
    abstract Run(params: TAiRunArguments): Promise<TAiRunOutput>

    async IsHealthy(): Promise<boolean> {
        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'health'
        )
        let _isHealthy = false
        try {
            const response = await axios.get(_url)
            _isHealthy = response.status === 200
        } catch {
            _isHealthy = false
        }

        Logger.Debug(`Health check for ${this.InstanceName} at ${_url}: ${_isHealthy
            ? 'OK 🟢'
            : 'KO 🔴'}`)

        return _isHealthy
    }
}