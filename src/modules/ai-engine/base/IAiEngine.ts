//
//
//
import type { clsClonable } from "../../../utils/base/clsClonable"
import type { AI_ENGINE } from "../@consts"
import type { TAiArguments, TAiOutput } from "../@types"
import type { T__ai_engines_ai_engine } from "../types/T__ai_engines_ai_engine"
import type { TAiDockerService } from "../types/TAiDockerService"

//
export interface IAiEngine extends clsClonable {
	AiEngineName: AI_ENGINE
	InstanceName: string
	InstanceApiUrl: string
	InstanceConfig: T__ai_engines_ai_engine | null

	AiDockerService: Record<string, TAiDockerService>
	RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>>

	Init: (aiName: string, aiConfig: T__ai_engines_ai_engine) => Promise<void>
	Run: (params: TAiArguments) => Promise<TAiOutput>
	IsHealthy: () => Promise<boolean>
	Prepare: () => Promise<void>
}
