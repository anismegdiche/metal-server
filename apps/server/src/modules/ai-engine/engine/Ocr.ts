//
//
//

import { Logger } from "@metal/logger"
import axios, { type AxiosResponse } from "axios"
import { merge } from "lodash-es"
//
import { Assert } from "../../../utils/Assert"
import { LangUtils } from "../../../utils/LangUtils"
import { StringUtils } from "../../../utils/StringUtils"
import { Utils } from "../../../utils/Utils"
import { ConfigManager } from "../../core/ConfigManager"
import type { U__server_ai_engines } from "../../core/types/U__server"
import { NormalizeError } from "../../errors/HttpErrors"
import { AI_ENGINE } from "../@consts"
import type { TAiArguments, TAiOutput } from "../@types"
import { AiDocker } from "../AiDocker"
import { absAiEngine } from "../base/absAiEngine"
import type { IAiEngine } from "../base/IAiEngine"
import { OCR_LANG, OCR_LANG_ISO, OCR_TASK } from "../consts/OCR"
import { OcrDockerService } from "../docker-services/OcrDockerService"
import type { T__ai_engines_ai_engine } from "../types/T__ai_engines_ai_engine"
import type { TAiDockerService } from "../types/TAiDockerService"
import type { U__plans_plan_run_ai_ocr_Params } from "../types/U__plans_plan_run_ai_ocr_Params"

//
const OCR_DEFAULT_HEADERS = {
	headers: {
		"Content-Type": "application/octet-stream",
	},
}

//
export class Ocr extends absAiEngine implements IAiEngine {
	AiEngineName = AI_ENGINE.OCR
	AiDockerService: Record<string, TAiDockerService> = {}
	RunTask: Record<string, (args: TAiArguments) => Promise<TAiOutput>> = {}

	DEFAULT: U__plans_plan_run_ai_ocr_Params = {
		task: OCR_TASK.IMAGE_TO_STRING,
		params: {
			lang: OCR_LANG_ISO.ENG,
		},
	}

	async _postOcrData(_url: string, data: string): Promise<AxiosResponse> {
		while (true) {
			try {
				return await axios.post(_url, Buffer.from(data, "base64"), OCR_DEFAULT_HEADERS)
			} catch (err: unknown) {
				const _err = NormalizeError(err)
				if (_err.response.status === 429) {
					Logger.Info(`${this.InstanceName} processing is busy, retrying`)
				} else {
					Logger.Warn(`${this.InstanceName} processing failed: ${_err.response.data.message ?? _err.message}`)
				}
				await Utils.Sleep(200)
			}
		}
	}

	@Logger.LogFunction()
	async Prepare() {
		this.AiDockerService = {
			[AI_ENGINE.OCR]: OcrDockerService,
		}

		this.RunTask = {
			[OCR_TASK.IMAGE_TO_STRING]: async (args: TAiArguments) => await this.ImageToString(args),
		}
	}

	@Logger.LogFunction()
	async Init(_aiName: string, aiConfig: T__ai_engines_ai_engine): Promise<void> {
		this.InstanceName = this.AiEngineName
		this.InstanceConfig = aiConfig
		this.InstanceCommonConfig = ConfigManager.Get<U__server_ai_engines>("server.ai-engines")
		this.InstanceApiUrl = StringUtils.Url(aiConfig.url || this.InstanceCommonConfig["engines-url"], this.InstanceName)

		await this.Prepare()
		await AiDocker.StartService({
			InstanceName: this.InstanceName,
			...(this.AiDockerService[this.InstanceName] as TAiDockerService),
		})
		Logger.Debug(`${Logger.Out} Successfully initialized Ocr instance '${this.InstanceName}'`)
	}

	@Logger.LogFunction(true)
	async Run(args: TAiArguments): Promise<TAiOutput> {
		const _sleep = AiDocker.Config.sleep
		const _timeout = AiDocker.Config.timeout

		Assert.Var<number>(_sleep, "server.ai-engines.sleep is not defined")
		Assert.Var<number>(_timeout, "server.ai-engines.timeout is not defined")

		const _args: U__plans_plan_run_ai_ocr_Params = merge(this.DEFAULT, args)
		const { task } = _args

		Assert.Condition(Object.values(OCR_TASK).includes(task as OCR_TASK), `Invalid ocr task: ${task}`)

		await Utils.Wait(async () => await this.IsHealthy(), _sleep, _timeout)
		return this.RunTask[task]!(args)
	}

	@Logger.LogFunction(true)
	async ImageToString(args: TAiArguments): Promise<TAiOutput> {
		const { data } = args
		const { task, params } = args as U__plans_plan_run_ai_ocr_Params

		Assert.Var(data, "data is required")

		const _url = StringUtils.Url(
			this.InstanceApiUrl,
			task,
			`?lang=${LangUtils.Convert(params?.lang, OCR_LANG_ISO, OCR_LANG)}`,
		)

		return this._postOcrData(_url, data).then((response) => {
			const ocr = {
				text: response.data.text,
				lang: LangUtils.Convert(response.data.language, OCR_LANG, OCR_LANG_ISO),
			}

			return {
				ocr,
			}
		})
	}
}
