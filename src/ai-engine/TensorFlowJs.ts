/* eslint-disable no-plusplus */
/* eslint-disable class-methods-use-this */
//
//
//
//
//
// import _ from 'lodash'
import Axios from 'axios'
import Jimp from 'jimp'
import * as Fs from 'fs'
// TensorFlow
import * as Tf from '@tensorflow/tfjs'
import * as MobileNet from '@tensorflow-models/mobilenet'
// import * as Toxicity from '@tensorflow-models/toxicity'
// import * as Use from '@tensorflow-models/universal-sentence-encoder'
//
import { Logger } from '../lib/Logger'
import { IAiEngine } from '../types/IAiEngine'
import { TJson } from '../types/TJson'

export class TensorFlowJs implements IAiEngine {
	public EngineName = 'tensorflowjs'
	public Name: string
	public Options: TJson
	// #Model: undefined | MobileNet.MobileNet | Use.UniversalSentenceEncoder | Toxicity.ToxicityClassifier = undefined
	#Model: undefined | MobileNet.MobileNet = undefined

	#LoadModel: Record<string, Function> = {
		object: async () => await MobileNet.load()
		// ,'toxicity': async () => await Toxicity.load(this.Params.Threshold as number, this.#ToxicityLabels)
		// 'sentiment': async () => await Use.load(),
	}

	#RunModel: Record<string, Function> = {
		object: async (imagePath: string) => await this.#ObjectDetection(imagePath)
		// ,        'toxicity': async (text: string) => await this.#ToxicityAnalyze(text)
		// 'sentiment': async (text: string) => await this.#SentimentAnalyze(text),
	}

	constructor(aiName: string, aiParams: any) {
		const { model, options } = aiParams ?? {}
		this.Name = aiName
		this.Options = {
			Model: model,
			Threshold: options?.threshold ?? 0.9
		}
		Tf.setBackend('cpu')
	}

	async Init() {
		this.#Model = await this.#LoadModel[this.Options.Model as string]()
	}

	async Run(text: string): Promise<any> {
		try {
			const _model = this.Options.Model as string
			return await this.#RunModel[_model](text)
		} catch (error) {
			Logger.Error(error)
			return undefined
		}
	}
	/* #region Object Detection */

	async #LoadImage(imagePath: string): Promise<Buffer> {
		if (imagePath.startsWith('http')) {
			const response = await Axios.get(imagePath, {
				responseType: 'arraybuffer'
			})
			return Buffer.from(response.data, 'binary')
		} else {
			return Fs.readFileSync(imagePath)
		}
	}

	async #ObjectDetection(imagePath: string): Promise<any> {
		const _imageBuffer = await this.#LoadImage(imagePath)
		const _image = await Jimp.read(_imageBuffer)
		_image.resize(224, 224)

		const _imageData = new Uint8Array(224 * 224 * 3)
		let _offset = 0

		_image.scan(0, 0, _image.bitmap.width, _image.bitmap.height, (x, y, idx) => {
			_imageData[_offset++] = _image.bitmap.data[idx]
			_imageData[_offset++] = _image.bitmap.data[idx + 1]
			_imageData[_offset++] = _image.bitmap.data[idx + 2]
		})

		const _tensor = Tf.tensor3d(_imageData, [224, 224, 3])

		const _predictions = await (this.#Model as MobileNet.MobileNet).classify(
			_tensor
		)

		Logger.Debug(JSON.stringify(_predictions))
		return {
			class: _predictions
		}
	}


	/* #endregion */

	// #ToxicityLabels = [
	//     'identity_attack',
	//     'insult',
	//     'obscene',
	//     'severe_toxicity',
	//     'sexual_explicit',
	//     'threat',
	//     'toxicity'
	// ]

	// async #ToxicityAnalyze(text: string): Promise<any> {
	//     const predictions = await (this.#Model as Toxicity.ToxicityClassifier).classify([text])
	//     if (predictions) {
	//         return _.chain(predictions)
	//             .keyBy('label')
	//             .mapValues(({ results }) => _.round(_.get(results, '[0].probabilities.1') ?? 0, 2))
	//             .value()
	//     }
	//     return predictions
	// }

	// /* #endregion */

	// async #SentimentAnalyze(text: string) {
	//     // Load the sentiment classifier
	//     const sentimentModel = await Tf.loadLayersModel(
	//         'https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json'
	//     )

	//     // Encode the input text
	//     const embeddings = await (this.#Model as Use.UniversalSentenceEncoder).embed([text])

	//     // Make predictions
	//     const predictions = sentimentModel.predict(
	//         TensorFlowJs.convertTensor2DToRank(embeddings)
	//     ) as Tf.Tensor

	//     return {
	//         sentiment: _.round(predictions.dataSync()[0], 2)
	//     }
	// }

	// private static convertTensor2DToRank(tensor: Tf.Tensor2D): Tf.Tensor<Tf.Rank> {
	//     const reshapedTensor = tensor.reshape(tensor.shape)
	//     return reshapedTensor
	// }
}
