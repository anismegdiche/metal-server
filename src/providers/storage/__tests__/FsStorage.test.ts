import { Readable } from "node:stream"
import { TConfigSource } from '../../../types/TConfig'
import { FsStorage, TFsStorageConfig } from '../FsStorage'
import Fs from 'fs'
import { ReadableHelper } from "../../../lib/ReadableHelper"
import typia from "typia"
import { TJsonContentConfig } from "../../content/JsonContent"


describe('FsStorage', () => {
    const sourceParams = <TConfigSource>{
        provider: "files",
        options: {
            ...typia.random<TFsStorageConfig>(),
            ...typia.random<TJsonContentConfig>()
        }
    }
    const fsStorage = new FsStorage()
    fsStorage.SetConfig(sourceParams)
    fsStorage.Init()

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
            expect(result).toBeInstanceOf(Readable)
            expect(ReadableHelper.ToString(result)).resolves.toBe('File content')
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

            const stream = Readable.from('File content')

            await fsStorage.Write('test.txt', stream)

            expect(Fs.promises.writeFile).toHaveBeenCalledWith(
                `${fsStorage.Params!.folder}test.txt`,
                stream,
                'utf8'
            )
        })

    })
})