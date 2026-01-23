//
//
//
import { merge } from 'lodash-es'
//
import { Assert } from '../../../utils/Assert'
import { Logger } from '../../../utils/Logger'
import { Utils } from '../../../utils/Utils'
import { AI_ENGINE } from '../@consts'
import type { TAiArguments, TAiOutput } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import type { IAiEngine } from '../base/IAiEngine'
import { IMAGE_TASK } from "../consts/IMAGE"
import { ImageImageClassificationDockerService, ImageImageSegmentationDockerService, ImageImageToTextDockerService, ImageObjectDetectionDockerService, ImageVisualQuestionAnsweringDockerService } from '../docker-services/ImageDockerService'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import type { TAiDockerService } from '../types/TAiDockerService'
import type {
    U_config_plans_plan_entity_run_ai_image_image_classification_Params,
    U_config_plans_plan_entity_run_ai_image_image_segmentation_Params,
    U_config_plans_plan_entity_run_ai_image_image_to_text_Params,
    U_config_plans_plan_entity_run_ai_image_object_detection_Params,
    U_config_plans_plan_entity_run_ai_image_Params,
    U_config_plans_plan_entity_run_ai_image_visual_question_answering_Params
} from '../types/U_config_plans_plan_entity_run_ai_image_Params'


//
export class Image extends absAiEngine implements IAiEngine {

    AiEngineName = AI_ENGINE.IMAGE
    AiDockerService: Record<string, TAiDockerService> = {}
    RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>> = {}
    DEFAULT: U_config_plans_plan_entity_run_ai_image_Params = {
        task: IMAGE_TASK.IMAGE_CLASSIFICATION,
        params: undefined
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Prepare(): Promise<void> {
        this.AiDockerService = {
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_CLASSIFICATION}`]: ImageImageClassificationDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_SEGMENTATION}`]: ImageImageSegmentationDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_TO_TEXT}`]: ImageImageToTextDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.OBJECT_DETECTION}`]: ImageObjectDetectionDockerService,
            [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.VISUAL_QUESTION_ANSWERING}`]: ImageVisualQuestionAnsweringDockerService
        }

        this.RunTask = {
            [IMAGE_TASK.IMAGE_CLASSIFICATION]: async (args: TAiArguments) => await this.ImageClassification(args),
            [IMAGE_TASK.IMAGE_SEGMENTATION]: async (args: TAiArguments) => await this.ImageSegmentation(args),
            [IMAGE_TASK.IMAGE_TO_TEXT]: async (args: TAiArguments) => await this.ImageToText(args),
            [IMAGE_TASK.OBJECT_DETECTION]: async (args: TAiArguments) => await this.ObjectDetection(args),
            [IMAGE_TASK.VISUAL_QUESTION_ANSWERING]: async (args: TAiArguments) => await this.VisualQuestionAnswering(args)
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

        Logger.Debug(`${Logger.Out} Successfully initialized Image instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiArguments): Promise<TAiOutput> {
        const _args: U_config_plans_plan_entity_run_ai_image_Params = merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(IMAGE_TASK).includes(task as IMAGE_TASK), `Invalid image task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
        return this.RunTask[task]!(args)
    }

    @Logger.LogFunction(true)
    async ImageClassification(args: TAiArguments): Promise<TAiOutput> {
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
    async ImageSegmentation(args: TAiArguments): Promise<TAiOutput> {
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
    async ImageToText(args: TAiArguments): Promise<TAiOutput> {
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
    async ObjectDetection(args: TAiArguments): Promise<TAiOutput> {
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
    async VisualQuestionAnswering(args: TAiArguments): Promise<TAiOutput> {
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
