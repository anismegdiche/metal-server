/* eslint-disable init-declarations */
import { TensorFlowJs } from '../TensorFlowJs'
import { IAiEngine } from '../../types/IAiEngine'
import _ from 'lodash'

const IMG_GUITAR =
	'https://thumbs.dreamstime.com/b/isolated-classical-guitar-photo-png-format-available-full-transparent-background-54363220.jpg'


describe('TensorFlowJs', () => {
	let tfjs: IAiEngine

	beforeAll(async () => {
		jest.clearAllMocks()
		tfjs = new TensorFlowJs('image-classification', { model: 'object' })
		await tfjs.Init()
	}, 120000)

	it('should initialize correctly', async () => {
		expect(tfjs.EngineName).toBe('tensorflowjs')
		expect(tfjs.Name).toBe('image-classification')
		expect(tfjs.Options.Model).toBe('object')
		expect(tfjs.Options.Threshold).toBe(0.9)
	})

	it('should run object detection successfully', async () => {
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
