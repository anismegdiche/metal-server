import { AI_ENGINE, TESSERACT_JS_MODEL } from '../../server/AiEngine'
import { TesseractJs } from '../TesseractJs'


const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => { })
const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { })
const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })


describe('TesseractJs', () => {

    beforeAll(() => {
        jest.clearAllMocks()
    })

    describe('Run', () => {

        it('should recognize the text in the image and return the result', async () => {
            const name = "my-ocr"
            const image = 'http://www.pdfunit.com/en/documentation/java/images/ocr-1.png'

            const _tesseractJs = new TesseractJs(name, {
                engine: AI_ENGINE.TESSERACT_JS,
                model: TESSERACT_JS_MODEL.ENG
            })
            await _tesseractJs.Init()

            const ocrResult = <Tesseract.Page>(await _tesseractJs.Run(image))

            const expectedResult = "Cedric himself knew nothing\nwhatever about it. It had never been\neven mentioned to him. He knew that\nhis papa had been an Englishman,\nbecause his mamma had told him so;\nbut then his papa had died when he\nwas so little a boy that he could not\nremember very much about him,\nexcept that he was big. and had blue\neyes and a long mustache, and that it\nwas a splendid thing to be carried\naround the room on his shoulder.\n"

            expect(ocrResult.text).toEqual(expectedResult)
        }, 120_000)
    })
})