import Fs from 'fs'
import { Readable } from 'node:stream'
import { TConfigSource } from "../../source/types/TConfigSource"
import { FsStorage } from '../providers/FsStorage'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { HttpErrorNotFound, HttpErrorInternalServerError } from '../../../modules/errors/HttpErrors'
import { ReadStream } from "node:fs"


describe('FsStorage', () => {
    const sourceConfig = <TConfigSource>{
        provider: 'files',
        options: {
            folder: './'
        }
    }
    const fsStorage = new FsStorage()
    fsStorage.SetConfig(sourceConfig)
    fsStorage.Init()

    beforeEach(() => {
        jest.restoreAllMocks()
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('IsExist', () => {
        it('should return true if the file exists', async () => {
            jest.spyOn(Fs, 'existsSync').mockReturnValue(true)

            const result = await fsStorage.FileIsExist('IsExist.txt')

            expect(result).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            jest.spyOn(Fs, 'existsSync').mockReturnValue(false)

            const result = await fsStorage.FileIsExist('IsExist-ko.txt')

            expect(result).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return the content of the file if it exists', async () => {
            jest.spyOn(Fs, 'createReadStream').mockReturnValue(Readable.from('File content', { encoding: 'utf8' }) as ReadStream)
            jest.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(true)

            const result = await fsStorage.FileRead('Read.txt')
            const content = await ReadableUtils.ToString(result)
            expect(content).toBe('File content')
        })

        it('should throw Not Found if the file does not exist', async () => {
            jest.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(false)

            await expect(fsStorage.FileRead('Read-ko.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        it('should write the content to the file', async () => {
            jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined)

            const stream = Readable.from('File content')

            await fsStorage.FileWrite('Write.txt', stream)

            expect(Fs.promises.writeFile).toHaveBeenCalledWith(
                `${fsStorage.Params!.folder}Write.txt`,
                stream,
                'utf8'
            )
        })
    })

    describe('Additional Tests', () => {
        it('should read existing file', async () => {
            fsStorage.Params = {
                folder: '/test/',
                autocreate: false
            }
            jest.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(true)
            jest.spyOn(Fs, 'createReadStream').mockReturnValue(Readable.from('', { encoding: 'utf8' }) as ReadStream)

            const result = await fsStorage.FileRead('existingFile.txt')

            expect(result).toBeInstanceOf(Readable)
            expect(Fs.createReadStream).toHaveBeenCalledWith('/test/existingFile.txt')
        })

        it('should throw error if no params defined', async () => {
            fsStorage.Params = undefined
            await expect(fsStorage.FileRead('file.txt')).rejects.toBeInstanceOf(HttpErrorInternalServerError)
        })

        it('should throw not found error if file does not exist and no autocreate', async () => {
            fsStorage.Params = {
                folder: '/test/',
                autocreate: false
            }
            jest.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(false)

            await expect(fsStorage.FileRead('nonExistentFile.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })
})