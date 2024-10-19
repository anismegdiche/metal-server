import { TSourceParams } from '../../../types/TSourceParams'
import { FsStorage } from '../FsStorage'
import Fs from 'fs'


describe('FsStorage', () => {
    const sourceParams = <TSourceParams>{
        provider: "files",
        options: {
            jsonArrayPath: 'data'
        }
    }
    const fsStorage = new FsStorage(sourceParams)

    beforeEach(() => {
        //
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('IsExist', () => {
        it('should return true if the file exists', async () => {
            jest.spyOn(Fs, 'existsSync').mockReturnValue(true)

            const result = await fsStorage.IsExist('test.txt')

            expect(result).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            jest.spyOn(Fs, 'existsSync').mockReturnValue(false)

            const result = await fsStorage.IsExist('test.txt')

            expect(result).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return the content of the file if it exists', async () => {
            jest.spyOn(Fs.promises, 'readFile').mockResolvedValue('File content')
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(true)

            const result = await fsStorage.Read('test.txt')

            expect(result).toBe('File content')
        })

        it('should return throw Not Found if the file does not exist', async () => {
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(false)
            try {
                await fsStorage.Read('test.txt')
            } catch (error: any) {
                expect(error?.name).toBe('HttpErrorNotFound')
            }
        })
    })

    describe('Write', () => {
        it('should write the content to the file', async () => {
            jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined)

            await fsStorage.Write('test.txt', 'File content')

            expect(Fs.promises.writeFile).toHaveBeenCalledWith(
                `${fsStorage.Params.database}test.txt`,
                'File content',
                'utf8'
            )
        })

    })
})