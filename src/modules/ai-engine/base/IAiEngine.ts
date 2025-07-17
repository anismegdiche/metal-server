

import { clsClonable } from '../../../utils/base/clsClonable'
import { AI_ENGINE } from '../@consts'
import { TAiRunOutput, TAiRunArguments, TConfigAiEngine } from '../@types'

export interface IAiEngine extends clsClonable {
    AiEngineName: AI_ENGINE
    InstanceName: string
    InstanceApiUrl: string
    InstanceConfig: TConfigAiEngine | null

    Init: (aiName: string, aiConfig: TConfigAiEngine) => Promise<void | null>
    Run: (params: TAiRunArguments) => Promise<TAiRunOutput>
    IsHealthy: () => Promise<boolean>
}