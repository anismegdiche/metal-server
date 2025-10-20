//
//
//
import axios from 'axios'
import _ from "lodash"
//
import { Assert } from '../../../utils/Assert'
import { LangUtils } from '../../../utils/LangUtils'
import { Logger } from '../../../utils/Logger'
import { StringUtils } from "../../../utils/StringUtils"
import { Utils } from '../../../utils/Utils'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { AI_ENGINE } from '../@consts'
import { TAiRunArguments, TAiRunOutput, TConfigAiEngine } from '../@types'
import { AiDocker } from '../AiDocker'
import { absAiEngine } from '../base/absAiEngine'
import { IAiEngine } from '../base/IAiEngine'
import { OCR_LANG, OCR_LANG_ISO, OCR_TASK } from "../consts/OCR"
import { OcrDockerService as SERVICE_OCR } from '../docker-services/OcrDockerService'
import { TStepRunAiOcrParams } from "../types/TStepRunAiOcrParams"

export class Ocr extends absAiEngine implements IAiEngine {
    AiEngineName = AI_ENGINE.OCR

    RunTask: Record<string, (args: TAiRunArguments) => Promise<TAiRunOutput>> = {}

    DEFAULT: TStepRunAiOcrParams = {
        task: OCR_TASK.IMAGE_TO_STRING,
        params: {
            lang: OCR_LANG_ISO.ENG
        }
    }

    constructor() {
        super()
    }

    @Logger.LogFunction()
    async Init(aiName: string, aiConfig: TConfigAiEngine): Promise<void> {
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

        const _args: TStepRunAiOcrParams = _.merge(this.DEFAULT, args)
        const { task } = _args

        if (Object.values(OCR_TASK).includes(task)) {
            await Utils.Wait(async () => await this.IsHealthy(), AiDocker.ServiceInstance.Sleep, AiDocker.ServiceInstance.Timeout)
            return await this.RunTask[task](args)
        }

        throw new HttpErrorInternalServerError(`Invalid model: ${task}`)
    }

    @Logger.LogFunction(true)
    async ImageToString(args: TAiRunArguments): Promise<TAiRunOutput> {

        const { data } = args
        const { task, params } = args as TStepRunAiOcrParams

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