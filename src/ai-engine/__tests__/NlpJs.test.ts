
import { AI_ENGINE, NLP_JS_MODEL, TConfigAiEngineNlpJs } from "../../server/AiEngine"
import { NlpJs } from "../NlpJs"

describe('NlpJs', () => {

	// NlpJs can be initialized with a valid instance name and configuration.
	it('should initialize NlpJs with a valid instance name and configuration', () => {
		const aiEngineInstanceName = 'instance1'
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: NLP_JS_MODEL.SENTIMENT,
			options: {
				lang: 'en'
			}
		}
		const nlpJs = new NlpJs(aiEngineInstanceName, aiEngineConfig)

		expect(nlpJs.AiEngineName).toBe(AI_ENGINE.NLP_JS)
		expect(nlpJs.InstanceName).toBe(aiEngineInstanceName)
		expect(nlpJs.Model).toBe(aiEngineConfig.model)
		expect(nlpJs.Options).toEqual(aiEngineConfig.options)
	})

	// NlpJs can load the sentiment analysis model.
	it('should load the sentiment analysis model', async () => {
		const aiEngineInstanceName = 'instance1'
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: NLP_JS_MODEL.SENTIMENT,
			options: {
				lang: 'en'
			}
		}
		const nlpJs = new NlpJs(aiEngineInstanceName, aiEngineConfig)

		await nlpJs.Init()

		expect(nlpJs.Model).toBeDefined()
	})

	// NlpJs can load the language guessing model.
	it('should load the language guessing model', async () => {
		const aiEngineInstanceName = 'instance1'
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: NLP_JS_MODEL.GUESS_LANG,
			options: {
				accept: ['en'],
				limit: 1
			}
		}
		const nlpJs = new NlpJs(aiEngineInstanceName, aiEngineConfig)

		await nlpJs.Init()

		expect(nlpJs.Model).toBeDefined()
	})

	// NlpJs cannot be initialized with an invalid instance name.
	it('should throw an error when initializing NlpJs with an invalid instance name', () => {
		const aiEngineInstanceName = ''
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: 'WrongModel' as NLP_JS_MODEL,
			options: {
				lang: 'en'
			}
		}

		expect(() => new NlpJs(aiEngineInstanceName, aiEngineConfig)).toThrow(undefined)
	})

	// NlpJs cannot be initialized with an invalid configuration.
	it('should throw an error when initializing NlpJs with an invalid configuration', () => {
		const aiEngineInstanceName = 'instance1'
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: 'invalid_model',
			options: {
				lang: 'en'
			}
		}

		expect(() => new NlpJs(aiEngineInstanceName, aiEngineConfig as TConfigAiEngineNlpJs)).toThrow(undefined)
	})

	// NlpJs cannot load an invalid model.
	it('should throw an error when loading an invalid model', async () => {
		const aiEngineInstanceName = 'instance1'
		const aiEngineConfig = {
			engine: AI_ENGINE.NLP_JS,
			model: NLP_JS_MODEL.SENTIMENT,
			options: {
				lang: 'en'
			}
		}
		const nlpJs = new NlpJs(aiEngineInstanceName, aiEngineConfig)

		nlpJs.Model = 'invalid_model'

		await expect(nlpJs.Init()).rejects.toThrow(undefined)
	})
})
