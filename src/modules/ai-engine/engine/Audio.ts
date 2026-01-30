//
//
//
import { merge } from 'lodash-es'
//
import { Assert } from '../../../utils/Assert'
import { Logger } from '../../../utils/Logger'
import { Utils } from '../../../utils/Utils'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { AI_ENGINE } from '../@consts'
import type { TAiArguments, TAiOutput } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import type { IAiEngine } from '../base/IAiEngine'
import { AUDIO_TASK } from '../consts/AUDIO'
import { AudioAudioClassificationDockerService, AudioAutomaticSpeechRecognitionDockerService } from '../docker-services/AudioDockerService'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { TAiDockerService } from '../types/TAiDockerService'
import type { U_config_plans_plan_entity_run_ai_audio_Params } from '../types/U_config_plans_plan_entity_run_ai_audio_Params'


//
export class Audio extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.AUDIO

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>> = {}

    DEFAULT: U_config_plans_plan_entity_run_ai_audio_Params = {
        task: AUDIO_TASK.AUDIO_CLASSIFICATION,
        params: undefined
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Prepare() {
        this.AiDockerService = {
            [`${AI_ENGINE.AUDIO}-${AUDIO_TASK.AUDIO_CLASSIFICATION}`]: AudioAudioClassificationDockerService,
            [`${AI_ENGINE.AUDIO}-${AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION}`]: AudioAutomaticSpeechRecognitionDockerService
        }

        this.RunTask = {
            [AUDIO_TASK.AUDIO_CLASSIFICATION]: async (args: TAiArguments) => await this.AudioClassification(args),
            [AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION]: async (args: TAiArguments) => await this.AutomaticSpeechRecognition(args)
        }
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
        await super.Init(aiName, aiConfig)
        await this.Prepare()
        await AiDocker.StartService({
            InstanceName: aiName,
            ...this.AiDockerService[this.InstanceName] as TAiDockerService
        })

        Logger.Debug(`${Logger.Out} Successfully initialized Audio instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiArguments): Promise<TAiOutput> {
        const _sleep = AiDocker.Config['sleep']
        const _timeout = AiDocker.Config['timeout']

        Assert.Var<number>(_sleep, "server.ai-engines.sleep is not defined")
        Assert.Var<number>(_timeout, "server.ai-engines.timeout is not defined")

        const _args: U_config_plans_plan_entity_run_ai_audio_Params = merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(AUDIO_TASK).includes(task as AUDIO_TASK), `Invalid audio task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), _sleep, _timeout)
        return this.RunTask[task]!(args)
    }

    @Logger.LogFunction(true)
    async AudioClassification(args: TAiArguments): Promise<TAiOutput> {
        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_audio_Params

        Assert.Var(data, 'data is required')

        // dictionary to map acronyms -> full names
        const labelMap: { [x: string]: string } = {
            hap: "happy",
            sad: "sad",
            neu: "neutral",
            ang: "angry"
        }

        return this._postData(data, params)
            .then((response) => {
                if (response.data.result === undefined) {
                    Logger.Error(`Audio processing failed: ${response.data.message}`)
                    throw new HttpErrorInternalServerError(`Audio processing failed: ${response.data.message}`)
                }

                const result = response.data.result.reduce((obj: { [x: string]: any }, item: { label: string; score: number }) => {
                    const fullName: string = labelMap[item.label as string] || item.label // fallback to acronym if not found
                    obj[fullName] = item.score
                    return obj
                }, {})

                return result
            })

        // response :
        // {
        //     neutral: 0.5449906587600708,
        //     happy: 0.24226616322994232,
        //     angry: 0.17592576146125793,
        //     sad: 0.03681737929582596,
        //   }
    }

    @Logger.LogFunction(true)
    async AutomaticSpeechRecognition(args: TAiArguments): Promise<TAiOutput> {
        const { data } = args
        const { params } = args as U_config_plans_plan_entity_run_ai_audio_Params

        return this._postData(data, params)
            .then((response) => {
                return response.data.result.text.trim()
            })
    }
}
