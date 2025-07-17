

import { clsClonable } from '../../../utils/base/clsClonable'
import { AI_ENGINE2 } from '../@consts'
import { TAiRunOutput, TAiRunArguments, TConfigAiEngine } from '../@types'

export interface IAiEngine2 extends clsClonable {
    AiEngineName: AI_ENGINE2
    InstanceName: string
    InstanceApiUrl: string
    InstanceConfig: TConfigAiEngine | null

    Init: (aiName: string, aiConfig: TConfigAiEngine) => Promise<void | null>
    Run: (params: TAiRunArguments) => Promise<TAiRunOutput>
    IsHealthy: () => Promise<boolean>
}