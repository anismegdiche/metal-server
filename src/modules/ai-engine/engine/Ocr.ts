//
//
//
import axios from 'axios'
import * as _ from 'lodash-es'
//
import { Assert } from '../../../utils/Assert'
import { LangUtils } from '../../../utils/LangUtils'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import { Utils } from '../../../utils/Utils'
import { AI_ENGINE } from '../@consts'
import type { TAiRunArguments, TAiRunOutput } from '../@types'
import type { T_config_ai_engines_ai_engine } from "../types/T_config_ai_engines_ai_engine"
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import type { IAiEngine } from '../base/IAiEngine'
import { OCR_LANG, OCR_LANG_ISO, OCR_TASK } from "../consts/OCR"
import { OcrDockerService as SERVICE_OCR } from '../docker-services/OcrDockerService'
import type { U_config_plans_plan_entity_run_ai_ocr_Params } from "../types/U_config_plans_plan_entity_run_ai_ocr_Params"

export class Ocr extends absAiEngine implements IAiEngine {
    AiEngineName = AI_ENGINE.OCR

    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: U_config_plans_plan_entity_run_ai_ocr_Params = {
        task: OCR_TASK.IMAGE_TO_STRING,
        params: {
            lang: OCR_LANG_ISO.ENG
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: T_config_ai_engines_ai_engine): Promise<void> {
        await super.Init(aiName, aiConfig)

        this.RunTask = {
            [OCR_TASK.IMAGE_TO_STRING]: async (args: TAiRunArguments) => await this.ImageToString(args)
        }

        await AiDocker.StartService({
            InstanceName: aiName,
            ...SERVICE_OCR
        })
        Logger.Debug(`${Logger.Out} Successfully initialized Ocr instance '${this.InstanceName}'`)
    }

    @Logger.LogFunction(true)
    async Run(args: TAiRunArguments): Promise<TAiRunOutput> {

        const _args: U_config_plans_plan_entity_run_ai_ocr_Params = _.merge(this.DEFAULT, args)
        const { task } = _args

        Assert.Condition(Object.values(OCR_TASK).includes(task as OCR_TASK), `Invalid ocr task: ${task}`)

        await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
        return this.RunTask[task]!(args)
    }

    @Logger.LogFunction(true)
    async ImageToString(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args
        const { task, params } = args as U_config_plans_plan_entity_run_ai_ocr_Params

        Assert.Var(data, 'data is required')

        const _url = StringUtils.Url(
            this.InstanceApiUrl,
            task,
            `?lang=${LangUtils.Convert(params?.lang, OCR_LANG_ISO, OCR_LANG)}`
        )

        try {
            const response = await axios.post(
                _url,
                Buffer.from(data, 'base64'),
                {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    }
                }
            )

            const ocr = {
                text: response.data.text,
                lang: LangUtils.Convert(response.data.language, OCR_LANG, OCR_LANG_ISO)
            }

            return {
                ocr
            }

        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`OCR request failed: ${error.response?.data?.message ?? error.message}`)
            }
            throw error
        }
    }
}