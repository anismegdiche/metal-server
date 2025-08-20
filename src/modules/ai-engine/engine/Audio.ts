//
//
//
import axios from 'axios'
import _ from "lodash"
//
import { Assert } from '../../../utils/Assert'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import { Utils } from '../../../utils/Utils'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { AI_ENGINE } from '../@consts'
import { TAiRunArguments, TAiRunOutput, TConfigAiEngine } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import { IAiEngine } from '../base/IAiEngine'
import { AUDIO_TASK } from '../consts/AUDIO'
import { AudioAudioClassificationDockerService, AudioAutomaticSpeechRecognitionDockerService } from '../docker-services/AudioDockerService'
import { TAiDockerService } from '../types/TAiDockerService'
import { TStepRunAiAudioParams } from '../types/TStepRunAiAudioParam'

//
const AUDIO_DEFAULT_HEADERS = {
    headers: {
        'Content-Type': 'application/json'
    }
}

//
export class Audio extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.AUDIO
    InstanceName: string
    InstanceConfig: TConfigAiEngine | null = null
    InstanceApiUrl: string = "http://localhost:5000"

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: TStepRunAiAudioParams = {
        task: AUDIO_TASK.AUDIO_CLASSIFICATION,
        params: undefined
    }

    constructor() {
        super()
        this.InstanceName = ""
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void> {
        this.InstanceName = aiName
        this.InstanceConfig = aiConfig
        this.InstanceApiUrl = aiConfig.url || "http://localhost:5000"

        this.AiDockerService = {
            [`${AI_ENGINE.AUDIO}-${AUDIO_TASK.AUDIO_CLASSIFICATION}`]: AudioAudioClassificationDockerService,
            [`${AI_ENGINE.AUDIO}-${AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION}`]: AudioAutomaticSpeechRecognitionDockerService
        }

        this.RunTask = {
            [AUDIO_TASK.AUDIO_CLASSIFICATION]: async (args: TAiRunArguments) => await this.AudioClassification(args),
            [AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION]: async (args: TAiRunArguments) => await this.AutomaticSpeechRecognition(args)
        }

        await AiDocker.StartService({
            InstanceName: aiName,
            ...this.AiDockerService[this.InstanceName]
        })

        Logger.Debug(`Successfully initialized Audio instance: ${this.InstanceName}`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {
        const _args: TStepRunAiAudioParams = _.merge(this.DEFAULT, args)
        const { task } = _args

        if (Object.values(AUDIO_TASK).includes(task as AUDIO_TASK)) {
            await Utils.Wait(async () => await this.IsHealthy())
            return await this.RunTask[task](args)
        }

        throw new HttpErrorInternalServerError(`Invalid audio task: ${task}`)
    }

    @Logger.LogFunction(true)
    async AudioClassification(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiAudioParams;

        Assert(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        )

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            AUDIO_DEFAULT_HEADERS
        ).catch(error => {
            throw new HttpErrorInternalServerError(`Audio processing failed: ${error.response?.data?.message ?? error.message}`)
        })

        if (response.data.result === undefined) {
            Logger.Error(`Audio processing failed: ${response.data.message}`)
            return {}
        }

        // dictionary to map acronyms -> full names
        const labelMap: { [x: string]: string } = {
            hap: "happy",
            sad: "sad",
            neu: "neutral",
            ang: "angry"
        };

        const _result = response.data.result.reduce((obj: { [x: string]: any }, item: { label: string; score: number }) => {
            const fullName:string = labelMap[item.label as string] || item.label; // fallback to acronym if not found
            obj[fullName] = item.score;
            return obj;
        }, {});

        return _result

        // response :
        // {
        //     neutral: 0.5449906587600708,
        //     happy: 0.24226616322994232,
        //     angry: 0.17592576146125793,
        //     sad: 0.03681737929582596,
        //   }
    }

    @Logger.LogFunction(true)
    async AutomaticSpeechRecognition(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiAudioParams;

        Assert(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            this.InstanceName,
            'run'
        )

        const response = await axios.post(
            _url,
            {
                input_data: data,
                params
            },
            AUDIO_DEFAULT_HEADERS
        ).catch(error => {
            throw new HttpErrorInternalServerError(`Audio processing failed: ${error.response?.data?.message ?? error.message}`)
        })

        return response.data.result.text.trim()
    }
}
