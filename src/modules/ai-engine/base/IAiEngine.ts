

import { clsClonable } from '../../../utils/base/clsClonable'
import { AI_ENGINE } from '../@consts'
import type { TAiRunOutput, TAiRunArguments } from '../@types'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"

export interface IAiEngine extends clsClonable {
    AiEngineName: AI_ENGINE
    InstanceName: string
    InstanceApiUrl: string
    InstanceConfig: T_config_ai_engines_ai_engine | null

    Init: (aiName: string, aiConfig: T_config_ai_engines_ai_engine) => Promise<void | null>
    Run: (params: TAiRunArguments) => Promise<TAiRunOutput>
    IsHealthy: () => Promise<boolean>
}