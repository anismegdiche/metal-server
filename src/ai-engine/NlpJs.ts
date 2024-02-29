//
//
//
//
//
import { Logger } from '../lib/Logger'
import { IAiEngine } from '../types/IAiEngine'
import { TJson } from '../types/TJson'
import { Helper } from '../lib/Helper'
import { AI_ENGINE, TConfigAiEngineNlpJsSentimentOptions, TConfigAiEngineNlpJsGuessLangOptions, TConfigAiEngineNlpJs, NLP_JS_MODEL } from '../server/AiEngine'
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SentimentAnalyzer, Language } = require('node-nlp')

export class NlpJs implements IAiEngine {

	AiEngineName = AI_ENGINE.NLP_JS
	InstanceName: string
	Model: string
	Options: TJson

	#Model?: typeof SentimentAnalyzer | typeof Language = undefined

	#LoadModel: Record<string, Function> = {
		[NLP_JS_MODEL.SENTIMENT]: () => new SentimentAnalyzer({ language: this.Options.Lang }),
		[NLP_JS_MODEL.GUESS_LANG]: () => new Language()
	}

	#RunModel: Record<string, Function> = {
		[NLP_JS_MODEL.SENTIMENT]: async (text: string) => await this.#SentimentAnalyze(text),
		[NLP_JS_MODEL.GUESS_LANG]: async (text: string) => await this.#GuessLanguage(text)
	}

	#SetDefaultOptions: Record<string, Function> = {
		[NLP_JS_MODEL.SENTIMENT]: (options: Partial<TConfigAiEngineNlpJsSentimentOptions> = {}) => NlpJs.#SentimentAnalyzeSetDefaultOptions(options),
		[NLP_JS_MODEL.GUESS_LANG]: (options: Partial<TConfigAiEngineNlpJsGuessLangOptions> = {}) => NlpJs.#GuessLanguageSetDefaultOptions(options)
	}

	constructor(aiEngineInstanceName: string, aiEngineConfig: TConfigAiEngineNlpJs) {
		this.InstanceName = aiEngineInstanceName
		this.Model = aiEngineConfig.model
		this.Options = this.#SetDefaultOptions[this.Model](aiEngineConfig.options) ?? Helper.CaseMapNotFound(this.Model)
	}

	async Init(): Promise<void> {
		this.#Model = await this.#LoadModel[this.Model]()
	}

	async Run(text: string): Promise<any> {
		return await this.#RunModel[this.Model](text)
			.catch((error: any) => {
				Logger.Error(`NlpJs.Run '${this.InstanceName}': '${JSON.stringify(this.Options)}',Text= '${text}'`)
				Logger.Error(error)
				return undefined
			})
	}

	async #SentimentAnalyze(text: string) {
		return await this.#Model.getSentiment(text)
	}

	static #SentimentAnalyzeSetDefaultOptions(aiEngineConfigOptions: Partial<TConfigAiEngineNlpJsSentimentOptions>): TConfigAiEngineNlpJsSentimentOptions {
		return {
			lang: 'en',
			...aiEngineConfigOptions
		}
	}

	async #GuessLanguage(text: string) {
		return await this.#Model.guess(text, this.Options.accept, this.Options.limit)
	}

	static #GuessLanguageSetDefaultOptions(aiEngineConfigOptions: Partial<TConfigAiEngineNlpJsGuessLangOptions>): TConfigAiEngineNlpJsGuessLangOptions {
		const options: TConfigAiEngineNlpJsGuessLangOptions = {
			accept: ['en'],
			limit: 1,
			...aiEngineConfigOptions
		}
		if (typeof options.accept === "string") {
			options.accept = options.accept.split(',')
		}
		return options
	}
}