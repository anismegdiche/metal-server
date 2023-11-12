/* eslint-disable init-declarations */
import { TensorFlowJs } from '../TensorFlowJs'
import { IAiEngine } from '../../types/IAiEngine'
// import { Logger } from '../../lib/Logger'

const IMG_GUITAR =
	'https://thumbs.dreamstime.com/b/isolated-classical-guitar-photo-png-format-available-full-transparent-background-54363220.jpg'

// // Mock Logger's methods
// jest.mock('../lib/Logger', () => ({
//     Logger: {
//         Error: jest.fn(),
//         Debug: jest.fn()
//     }
// }))

describe('TensorFlowJs', () => {
	let tfjs: IAiEngine

	beforeAll(async () => {
		jest.clearAllMocks()
		tfjs = new TensorFlowJs('image-classification', { model: 'object' })
		await tfjs.Init()
	})

	// afterEach(() => {
	//     // jest.clearAllMocks()
	// })

	it('should initialize correctly', async () => {
		expect(tfjs.EngineName).toBe('tensorflowjs')
		expect(tfjs.Name).toBe('image-classification')
		expect(tfjs.Options.Model).toBe('object')
		expect(tfjs.Options.Threshold).toBe(0.9)
	})

	it('should run object detection successfully', async () => {
		// const mockClassify = jest.fn().mockResolvedValue(['class1', 'class2'])

		const result = await tfjs.Run(IMG_GUITAR)

		expect(result).toEqual({
			class: [
				{
					className: 'screw',
					probability: 0.6480130553245544
				},
				{
					className: 'acoustic guitar',
					probability: 0.31899163126945496
				},
				{
					className: 'electric guitar',
					probability: 0.014988447539508343
				}
			]
		})

		// expect(mockClassify).toHaveBeenCalled()
		// expect(mockClassify.mock.calls[0][0]).toEqual(expect.any(Object))
		// Additional assertions for #LoadImage, Jimp, etc. can be added here
	})

	// it('should handle errors during Run', async () => {
	//     const mockError = new Error('Test error')
	//     // const mockClassify = jest.fn().mockRejectedValue(mockError)

	//     const result = await tfjs.Run(IMG_GUITAR)

	//     expect(result).toBeUndefined()
	//     expect(Logger.Error).toHaveBeenCalledWith(mockError)
	// })
})
