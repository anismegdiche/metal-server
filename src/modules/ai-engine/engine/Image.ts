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
import { IMAGE_TASK } from "../consts/IMAGE"
import { ImageImageClassificationDockerService, ImageImageSegmentationDockerService, ImageImageToTextDockerService, ImageObjectDetectionDockerService, ImageVisualQuestionAnsweringDockerService } from '../docker-services/ImageDockerService'
import { TAiDockerService } from '../types/TAiDockerService'
import { TStepRunAiImageParams, TStepRunAiImageVisualQuestionAnsweringParams } from '../types/TStepRunAiImageParam'

//
const IMAGE_DEFAULT_HEADERS = {
    headers: {
        'Content-Type': 'application/json'
    }
}

//
export class Image extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.IMAGE
    InstanceName: string
    InstanceConfig: TConfigAiEngine | null = null
    InstanceApiUrl: string = "http://localhost:5000"

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: TStepRunAiImageParams = {
        task: IMAGE_TASK.IMAGE_CLASSIFICATION,
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
            // [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.DEPTH_ESTIMATION}`]: ImageImageDepthEstimationDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_CLASSIFICATION}`]: ImageImageClassificationDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_SEGMENTATION}`]: ImageImageSegmentationDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_TO_TEXT}`]: ImageImageToTextDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.OBJECT_DETECTION}`]: ImageObjectDetectionDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.VISUAL_QUESTION_ANSWERING}`]: ImageVisualQuestionAnsweringDockerService
        }

        this.RunTask = {
            // [IMAGE_TASK.DEPTH_ESTIMATION]: async (args: TAiRunArguments) => await this.DepthEstimation(args),
            [IMAGE_TASK.IMAGE_CLASSIFICATION]: async (args: TAiRunArguments) => await this.ImageClassification(args),
            [IMAGE_TASK.IMAGE_SEGMENTATION]: async (args: TAiRunArguments) => await this.ImageSegmentation(args),
            [IMAGE_TASK.IMAGE_TO_TEXT]: async (args: TAiRunArguments) => await this.ImageToText(args),
            [IMAGE_TASK.OBJECT_DETECTION]: async (args: TAiRunArguments) => await this.ObjectDetection(args),
            [IMAGE_TASK.VISUAL_QUESTION_ANSWERING]: async (args: TAiRunArguments) => await this.VisualQuestionAnswering(args)
        }

        await AiDocker.StartService({
            InstanceName: aiName,
            ...this.AiDockerService[this.InstanceName]
        })

        Logger.Debug(`Successfully initialized Image instance: ${this.InstanceName}`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {
        const _args: TStepRunAiImageParams = _.merge(this.DEFAULT, args)
        const { task } = _args

        if (Object.values(IMAGE_TASK).includes(task as IMAGE_TASK)) {
            await Utils.Wait(async () => await this.IsHealthy())
            return await this.RunTask[task](args)
        }

        throw new HttpErrorInternalServerError(`Invalid image task: ${task}`)
    }

    async #ProcessImageTask(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageParams;
        
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
            IMAGE_DEFAULT_HEADERS
        ).catch(error => {
            throw new HttpErrorInternalServerError(`Image processing failed: ${error.response?.data?.message ?? error.message}`)
        })

        return response.data.result[0]
    }

    // @Logger.LogFunction(true)
    // async DepthEstimation(args: TAiRunArguments): Promise<TAiRunOutput> {
    //     Assert(args?.data, 'data is required')
    //     return await this.#ProcessImageTask(args)
    // }

    @Logger.LogFunction(true)
    async ImageClassification(args: TAiRunArguments): Promise<TAiRunOutput> {
        Assert(args?.data, 'data is required')
        return await this.#ProcessImageTask(args)
    }

    @Logger.LogFunction(true)
    async ImageSegmentation(args: TAiRunArguments): Promise<TAiRunOutput> {
        Assert(args?.data, 'data is required')
        return await this.#ProcessImageTask(args)
    }

    @Logger.LogFunction(true)
    async ImageToText(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageParams;
        
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
            IMAGE_DEFAULT_HEADERS
        ).catch(error => {
            throw new HttpErrorInternalServerError(`Image processing failed: ${error.response?.data?.message ?? error.message}`)
        })

        return response.data.result[0]
    }

    @Logger.LogFunction(true)
    async ObjectDetection(args: TAiRunArguments): Promise<TAiRunOutput> {
        Assert(args?.data, 'data is required')
        return await this.#ProcessImageTask(args)
    }

    @Logger.LogFunction(true)
    async VisualQuestionAnswering(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { params } = args as TStepRunAiImageVisualQuestionAnsweringParams
        Assert(args?.data, 'data is required')
        Assert(params?.question, 'params.question is required')
        return await this.#ProcessImageTask(args)
    }
}
