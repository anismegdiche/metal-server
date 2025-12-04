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
import { TStepRunAiImageImageClassificationParams, TStepRunAiImageImageSegmentationParams, TStepRunAiImageImageToTextParams, TStepRunAiImageObjectDetectionParams, TStepRunAiImageParams, TStepRunAiImageVisualQuestionAnsweringParams } from '../types/TStepRunAiImageParam'

//
const IMAGE_DEFAULT_HEADERS = {
    headers: {
        'Content-Type': 'application/json'
    }
}

//
export class Image extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.IMAGE

    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: TStepRunAiImageParams = {
        task: IMAGE_TASK.IMAGE_CLASSIFICATION,
        params: undefined
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void> {
        await super.Init(aiName, aiConfig)

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

        Logger.Debug(`${Logger.Out} Successfully initialized Image instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {
        const _args: TStepRunAiImageParams = _.merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(IMAGE_TASK).includes(task as IMAGE_TASK), `Invalid image task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
        return this.RunTask[task](args)
    }

    @Logger.LogFunction(true)
    async ImageClassification(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageImageClassificationParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
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

        const objects = response.data.result

        return {
            objects
        }
    }

    @Logger.LogFunction(true)
    async ImageSegmentation(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageImageSegmentationParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
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

        const masks = response.data?.masks

        return {
            masks
        }
    }

    @Logger.LogFunction(true)
    async ImageToText(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageImageToTextParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
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

        const result: string = response.data.result[0].generated_text

        return {
            text: result.trim()
        }
    }

    @Logger.LogFunction(true)
    async ObjectDetection(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageObjectDetectionParams;

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
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

        const objects = response.data.result

        return {
            objects
        }
    }

    @Logger.LogFunction(true)
    async VisualQuestionAnswering(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as TStepRunAiImageVisualQuestionAnsweringParams;

        Assert.Var(data, 'data is required')
        Assert.Var(params.question, 'params.question is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
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

        const answers = response.data.result

        return {
            answers
        }
    }
}
