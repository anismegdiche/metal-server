/* eslint-disable no-plusplus */
//
//
//
//
//
import Axios from 'axios'
import Jimp from 'jimp'
import * as Fs from 'fs'
//
import { Logger } from '../lib/Logger'
import { IAiEngine } from '../types/IAiEngine'
import { TJson } from '../types/TJson'
import { Helper } from '../lib/Helper'
// TensorFlow
import * as Tf from '@tensorflow/tfjs'
import * as MobileNet from '@tensorflow-models/mobilenet'
import { AI_ENGINE, TConfigAiEngineTensorFlowJsImageClassifyOptions, TENSORFLOW_JS_MODEL } from '../server/Config'


export class TensorFlowJs implements IAiEngine {
	public AiEngineName = AI_ENGINE.TENSORFLOW_JS
	public InstanceName: string
	public Model: string
	public Options: TJson

	#Model?: MobileNet.MobileNet = undefined

	#LoadModel: Record<string, Function> = {
		[TENSORFLOW_JS_MODEL.IMAGE_CLASSIFY]: async () => await MobileNet.load()
	}

	#RunModel: Record<string, Function> = {
		[TENSORFLOW_JS_MODEL.IMAGE_CLASSIFY]: async (imagePath: string) => await this.#ImageClassify(imagePath)
	}

	#SetDefaultOptions: Record<string, Function> = {
		[TENSORFLOW_JS_MODEL.IMAGE_CLASSIFY]: (options: Partial<TConfigAiEngineTensorFlowJsImageClassifyOptions> = {}) => TensorFlowJs.#ImageClassifySetDefaultOptions(options)
	}

	static #ImageClassifySetDefaultOptions(aiEngineConfigOptions: Partial<TConfigAiEngineTensorFlowJsImageClassifyOptions>): TConfigAiEngineTensorFlowJsImageClassifyOptions {
		return {
			threshold: 0.9,
			...aiEngineConfigOptions
		}
	}

	constructor(aiEngineInstanceName: string, aiEngineConfig: any) {
		this.InstanceName = aiEngineInstanceName
		this.Model = aiEngineConfig.model
		this.Options = this.#SetDefaultOptions[this.Model](aiEngineConfig.options) || Helper.CaseMapNotFound(this.Model)
		Tf.setBackend('cpu')
	}

	async Init(): Promise<void> {
		this.#Model = await this.#LoadModel[this.Model]()
	}

	async Run(imagePath: string): Promise<any> {
		return await this.#RunModel[this.Model](imagePath)
			.catch((error: any) => {
				Logger.Error(`TensorFlowJs.Run '${this.InstanceName}': '${JSON.stringify(this.Options)}', on '${imagePath}'`)
				Logger.Error(error)
				return undefined
			})
	}

	static async #LoadImage(imagePath: string): Promise<Buffer> {
		if (imagePath.startsWith('http')) {
			const response = await Axios.get(imagePath, {
				responseType: 'arraybuffer'
			})
			return Buffer.from(response.data, 'binary')
		}
		return Fs.readFileSync(imagePath)
	}

	async #ImageClassify(imagePath: string): Promise<any> {
		const imageBuffer = await TensorFlowJs.#LoadImage(imagePath)
		const image = await Jimp.read(imageBuffer)
		image.resize(224, 224)

		const imageData = new Uint8Array(224 * 224 * 3)
		let offset = 0

		image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
			imageData[offset++] = image.bitmap.data[idx]
			imageData[offset++] = image.bitmap.data[idx + 1]
			imageData[offset++] = image.bitmap.data[idx + 2]
		})

		const tensor = Tf.tensor3d(imageData, [224, 224, 3])

		const predictions = await (this.#Model as MobileNet.MobileNet).classify(tensor)

		Logger.Debug(JSON.stringify(predictions))
		return {
			class: predictions
		}
	}
}
