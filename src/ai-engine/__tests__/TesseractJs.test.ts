import { AI_ENGINE, TESSERACT_JS_MODEL } from '../../server/AiEngine'
import { TesseractJs } from '../TesseractJs'

const TEST_TIMEOUT = 120000

describe('TesseractJs', () => {

    beforeAll(() => {
        jest.clearAllMocks()
    })

    describe('Run', () => {

        it('should recognize the text in the image and return the result', async () => {
            const name = "my-ocr"
            const image = 'https://tesseract.projectnaptha.com/img/eng_bw.png'

            const _tesseractJs = new TesseractJs(name, {
                engine: AI_ENGINE.TESSERACT_JS,
                model: TESSERACT_JS_MODEL.ENG
            })
            await _tesseractJs.Init()

            const ocrResult = <Tesseract.Page>(await _tesseractJs.Run(image))

            const expectedResult = `Mild Splendour of the various-vested Night!\nMother of Wildly-working visions! haill\nI watch thy gliding, while with watery light\nThy weak eye glimmers through a ﬂeecy veil;\nAnd when thou lovest thy pale orb to shroud\nBehind the gather’d blackness lost on high;\nAnd when thou dartest from the wind-rent cloud\nThy placid lightning o’er the awaken’d sky.\n\n`

            expect(ocrResult.text).toEqual(expectedResult)
        }, TEST_TIMEOUT)
    })
})