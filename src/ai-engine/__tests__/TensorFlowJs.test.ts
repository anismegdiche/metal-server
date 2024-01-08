/* eslint-disable init-declarations */
import _ from 'lodash'
import { IAiEngine } from '../../types/IAiEngine'
import { TensorFlowJs } from '../TensorFlowJs'

const IMG_GUITAR =
	'https://thumbs.dreamstime.com/b/isolated-classical-guitar-photo-png-format-available-full-transparent-background-54363220.jpg'


describe('TensorFlowJs', () => {
	let tfjs: IAiEngine

	beforeAll(async () => {
		jest.clearAllMocks()
		tfjs = new TensorFlowJs('image-classification', {
			model: 'image-classify'
		})
		await tfjs.Init()
	}, 120000)

	it('should initialize correctly', async () => {
		expect(tfjs.AiEngineName).toBe('tensorflowjs')
		expect(tfjs.InstanceName).toBe('image-classification')
		expect(tfjs.Model).toBe('image-classify')
		expect(tfjs.Options?.threshold).toBe(0.9)
	})

	it('should run image classification successfully', async () => {
		const result: any = await tfjs.Run(IMG_GUITAR)
		const resultWOProbability = {
			class: _.map(result.class, obj => _.omit(obj, 'probability'))
		}

		expect(resultWOProbability).toEqual({
			class: [
				{
					className: 'screw'
				},
				{
					className: 'acoustic guitar'
				},
				{
					className: 'electric guitar'
				}
			]
		})
	})
})
