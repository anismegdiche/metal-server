//
//
//
//
//
import { Logger } from '../lib/Logger'
import { IAiEngine } from '../types/IAiEngine'
import { TJson } from '../types/TJson'
import { Helper } from '../lib/Helper'
import { TAiEngineParams } from '../types/TAiEngineParams'
//
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SentimentAnalyzer, Language } = require('node-nlp')

export type TNlpJsSentimentOptions = {
	lang: string
}

export type TNlpJsGuessLangOptions = {
	accept: string[] | string
	limit: number | undefined
}

export type TNlpJsEngineParams = TAiEngineParams & {
	model: "sentiment" | "guess-lang"
	options: TNlpJsSentimentOptions | TNlpJsGuessLangOptions
}

export class NlpJs implements IAiEngine {

	public AiEngineName = 'nlpjs'
	public InstanceName: string
	public Model: string
	public Options: TJson

	#Model?: typeof SentimentAnalyzer | typeof Language = undefined

	#LoadModel: Record<string, Function> = {
		sentiment: () => new SentimentAnalyzer({ language: this.Options.Lang }),
		"guess-lang": () => new Language()
	}

	#RunModel: Record<string, Function> = {
		sentiment: async (text: string) => await this.#SentimentAnalyze(text),
		"guess-lang": async (text: string) => await this.#GuessLanguage(text)
	}

	#SetDefaultOptions: Record<string, Function> = {
		sentiment: (options: Partial<TNlpJsSentimentOptions> = {}) => NlpJs.#SentimentAnalyzeSetDefaultOptions(options),
		"guess-lang": (options: Partial<TNlpJsGuessLangOptions> = {}) => NlpJs.#GuessLanguageSetDefaultOptions(options)
	}

	constructor(aiEngineInstanceName: string, aiEngineParams: TNlpJsEngineParams) {
		this.InstanceName = aiEngineInstanceName
		this.Model = aiEngineParams.model
		this.Options = this.#SetDefaultOptions[this.Model](aiEngineParams.options) || Helper.CaseMapNotFound(this.Model)
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

	static #SentimentAnalyzeSetDefaultOptions(aiEngineOptions: Partial<TNlpJsSentimentOptions>): TNlpJsSentimentOptions {
		return {
			lang: 'en',
			...aiEngineOptions
		}
	}

	async #GuessLanguage(text: string) {
		return await this.#Model.guess(text, this.Options.accept, this.Options.limit)
	}

	static #GuessLanguageSetDefaultOptions(aiEngineOptions: Partial<TNlpJsGuessLangOptions>): TNlpJsGuessLangOptions {
		const options: TNlpJsGuessLangOptions = {
			accept: ['en'],
			limit: 1,
			...aiEngineOptions
		}
		if (typeof options.accept === "string") {
			options.accept = options.accept.split(',')
		}
		return options
	}
}