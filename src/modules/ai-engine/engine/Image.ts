//
//
//
import axios, { type AxiosResponse } from 'axios';
import * as _ from 'lodash-es';
//
import { Assert } from '../../../utils/Assert';
import { Logger } from '../../../utils/Logger';
import { StringUtils } from "../../../utils/StringUtils";
import { Utils } from '../../../utils/Utils';
import { AI_ENGINE } from '../@consts';
import type { TAiRunArguments, TAiRunOutput } from '../@types';
import { AiDocker } from '../AiDocker';
import { absAiEngine } from '../base/absAiEngine';
import type { IAiEngine } from '../base/IAiEngine';
import { IMAGE_TASK } from "../consts/IMAGE";
import { ImageImageClassificationDockerService, ImageImageSegmentationDockerService, ImageImageToTextDockerService, ImageObjectDetectionDockerService, ImageVisualQuestionAnsweringDockerService } from '../docker-services/ImageDockerService';
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine";
import type { TAiDockerService } from '../types/TAiDockerService';
import type {
    U_config_plans_plan_entity_run_ai_image_image_classification_Params,
    U_config_plans_plan_entity_run_ai_image_image_segmentation_Params,
    U_config_plans_plan_entity_run_ai_image_image_to_text_Params,
    U_config_plans_plan_entity_run_ai_image_object_detection_Params,
    U_config_plans_plan_entity_run_ai_image_Params,
    U_config_plans_plan_entity_run_ai_image_visual_question_answering_Params
} from '../types/U_config_plans_plan_entity_run_ai_image_Params';


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
    DEFAULT: U_config_plans_plan_entity_run_ai_image_Params = {
        task: IMAGE_TASK.IMAGE_CLASSIFICATION,
        params: undefined
    }

    constructor() {
        super()
    }

    async _postData(data: any, params: any): Promise<AxiosResponse> {

        const _url = StringUtils.Url(this.InstanceApiUrl, 'run')
        while (true) {
            try {
                return await axios.post(
                    _url,
                    {
                        input_data: data,
                        params
                    },
                    IMAGE_DEFAULT_HEADERS
                )
            } catch (error: any) {
                if (error.response?.status === 429) {
                    Logger.Info(`${this.InstanceName} processing is busy, retrying`)
                } else {
                    Logger.Warn(`${this.InstanceName} processing failed: ${error.response?.data?.message ?? error.message}`)
                }
                await Utils.Sleep(200)
                // } else {
                //     throw new HttpErrorInternalServerError(`Image processing failed: ${error.response?.data?.message ?? error.message}`)
                // }
            }
        }
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
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
            ...this.AiDockerService[this.InstanceName] as TAiDockerService
        })

        Logger.Debug(`${Logger.Out} Successfully initialized Image instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {
        const _args: U_config_plans_plan_entity_run_ai_image_Params = _.merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(IMAGE_TASK).includes(task as IMAGE_TASK), `Invalid image task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
        return this.RunTask[task]!(args)
    }

    @Logger.LogFunction(true)
    async ImageClassification(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as U_config_plans_plan_entity_run_ai_image_image_classification_Params;

        Assert.Var(data, 'data is required')

        return this._postData(data, params)
            .then((response) => {
                const objects = response.data.result
                return {
                    objects
                }
            })
    }

    @Logger.LogFunction(true)
    async ImageSegmentation(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as U_config_plans_plan_entity_run_ai_image_image_segmentation_Params;

        Assert.Var(data, 'data is required')

        return this._postData(data, params)
            .then((response) => {
                const masks = response.data?.masks
                return {
                    masks
                }
            })
    }

    @Logger.LogFunction(true)
    async ImageToText(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as U_config_plans_plan_entity_run_ai_image_image_to_text_Params;

        Assert.Var(data, 'data is required')

        return this._postData(data, params)
            .then((response) => {
                const result: string = response.data.result[0].generated_text
                return {
                    text: result.trim()
                }
            })
    }

    @Logger.LogFunction(true)
    async ObjectDetection(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as U_config_plans_plan_entity_run_ai_image_object_detection_Params;

        Assert.Var(data, 'data is required')

        return this._postData(data, params)
            .then((response) => {
                const objects = response.data.result
                return {
                    objects
                }
            })
    }

    @Logger.LogFunction(true)
    async VisualQuestionAnswering(args: TAiRunArguments): Promise<TAiRunOutput> {
        const { data } = args;
        const { params } = args as U_config_plans_plan_entity_run_ai_image_visual_question_answering_Params;

        Assert.Var(data, 'data is required')
        Assert.Var(params.question, 'params.question is required')

        return this._postData(data, params)
            .then((response) => {
                const answers = response.data.result
                return {
                    answers
                }
            })
    }
}
