//
//
//
//
//
import _ from 'lodash'
import { Logger } from '../lib/Logger'
import { IAiEngine } from '../types/IAiEngine'
import { TJson } from '../types/TJson'
//
// import { SentimentAnalyzer } from 'node-nlp-typescript'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { SentimentAnalyzer, Language } = require('node-nlp')

export type TNlpJsSentimentOptions = {
	lang: string
}

export type TNlpJsGuessLangOptions = {
	accept: string[]
	limit: number | undefined
}

export type TNlpJsOptions = TNlpJsSentimentOptions | TNlpJsGuessLangOptions


export type TNlpJsEngineParams = {
	model: "sentiment" | "guess-lang"
	options: TNlpJsOptions
}


export class NlpJs implements IAiEngine {
	public EngineName = 'nlpjs'
	public Name: string
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
		sentiment: (options: Partial<TNlpJsSentimentOptions> = {}) => NlpJs.#SentimentSetDefaultOptions(options),
		"guess-lang": (options: Partial<TNlpJsGuessLangOptions> = {}) => NlpJs.#GuessLanguageSetDefaultOptions(options)
	}

	constructor(aiEngineName: string, aiEngineParams: TNlpJsEngineParams) {
		this.Name = aiEngineName
		this.Model = aiEngineParams.model
		this.Options = this.#SetDefaultOptions[this.Model](aiEngineParams.options)
	}

	async Init(): Promise<void> {
		this.#Model = this.#LoadModel[this.Model as string]()
	}

	async Run(text: string): Promise<any> {
		try {
			const _model = this.Model as string
			return await this.#RunModel[_model](text)
		} catch (error) {
			Logger.Error(`NlpJs.Run '${this.Name}': '${JSON.stringify(this.Options)}',Text= '${text}'`)
			Logger.Error(error)
			return undefined
		}
	}

	async #SentimentAnalyze(text: string) {
		return await this.#Model.getSentiment(text)
	}

	static #SentimentSetDefaultOptions(options: Partial<TNlpJsSentimentOptions>): TNlpJsSentimentOptions {
		return {
			lang: 'en',
			...options
		}
	}

	async #GuessLanguage(text: string) {
		return await this.#Model.guess(text, this.Options.accept, this.Options.limit)
	}

	static #GuessLanguageSetDefaultOptions(options: Partial<TNlpJsGuessLangOptions>): TNlpJsGuessLangOptions {
		const _options: TNlpJsGuessLangOptions = {
			accept: ['en'],
			limit: 1,
			...options
		}
		if (_.isString(_options.accept)) {
			_options.accept = _.split(_options.accept, ',')
		}
		return _options
	}
}