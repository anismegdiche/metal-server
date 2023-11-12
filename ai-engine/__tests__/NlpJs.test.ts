//
//
//
import { NlpJs, TNlpJsEngineParams } from '../NlpJs'

describe('NlpJs', () => {
	beforeAll(async () => {
		jest.clearAllMocks()
	})

	it('should run sentiment analysis', async () => {
		const name = 'sentiment-analyzer'
		const params = <TNlpJsEngineParams>{
			model: 'sentiment',
			options: {
				lang: 'en'
			}
		}
		const text = 'Hey you i love it'

		const sentimentResult = {
			average: 0.1,
			locale: "en",
			numHits: 1,
			numWords: 5,
			score: 0.5,
			type: "senticon",
			vote: "positive"
		}

		const nlpJs = new NlpJs(name, params)
		await nlpJs.Init()
		const result = await nlpJs.Run(text)

		expect(result).toEqual(sentimentResult)
	})

	it('should return the language code when given a text', async () => {
		const name = 'lang-guesser'
		const params = <TNlpJsEngineParams>{
			model: 'guess-lang',
			options: {
				accept: ['fr', 'en'],
				limit: 2
			}
		}
		const text = 'Hey you i love it'

		const assertedResult = [
			{
				alpha3: "fra",
				alpha2: "fr",
				language: "French",
				score: 1
			},
			{
				alpha3: "eng",
				alpha2: "en",
				language: "English",
				score: 0.8415637860082305
			}
		]

		const nlpJs = new NlpJs(name, params)
		await nlpJs.Init()
		const result = await nlpJs.Run(text)

		expect(result).toEqual(assertedResult)
	})
})