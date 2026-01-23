//
//
//
import { clsClonable } from '../../../utils/base/clsClonable'
import { AI_ENGINE } from '../@consts'
import type { TAiArguments, TAiOutput } from '../@types'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { TAiDockerService } from '../types/TAiDockerService'


//
export interface IAiEngine extends clsClonable {
    AiEngineName: AI_ENGINE
    InstanceName: string
    InstanceApiUrl: string
    InstanceConfig: T_config_ai_engines_ai_engine | null

    AiDockerService: Record<string, TAiDockerService>
    RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>>

    Init: (aiName: string, aiConfig: T_config_ai_engines_ai_engine) => Promise<void | null>
    Run: (params: TAiArguments) => Promise<TAiOutput>
    IsHealthy: () => Promise<boolean>
    Prepare: () => Promise<void>
}