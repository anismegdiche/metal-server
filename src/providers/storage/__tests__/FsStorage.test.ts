import Fs from 'fs'
import { Readable } from 'node:stream'
import { TConfigSource } from '../../../types/TConfig'
import { FsStorage } from '../FsStorage'
import { ReadableHelper } from '../../../lib/ReadableHelper'
import { HttpErrorNotFound, HttpErrorInternalServerError } from '../../../server/HttpErrors'
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

            const result = await fsStorage.IsExist('IsExist.txt')

            expect(result).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            jest.spyOn(Fs, 'existsSync').mockReturnValue(false)

            const result = await fsStorage.IsExist('IsExist-ko.txt')

            expect(result).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return the content of the file if it exists', async () => {
            jest.spyOn(Fs, 'createReadStream').mockReturnValue(Readable.from('File content', { encoding: 'utf8' }) as ReadStream)
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(true)

            const result = await fsStorage.Read('Read.txt')
            const content = await ReadableHelper.ToString(result)
            expect(content).toBe('File content')
        })

        it('should throw Not Found if the file does not exist', async () => {
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(false)

            await expect(fsStorage.Read('Read-ko.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        it('should write the content to the file', async () => {
            jest.spyOn(Fs.promises, 'writeFile').mockResolvedValue(undefined)

            const stream = Readable.from('File content')

            await fsStorage.Write('Write.txt', stream)

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
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(true)
            jest.spyOn(Fs, 'createReadStream').mockReturnValue(Readable.from('', { encoding: 'utf8' }) as ReadStream)

            const result = await fsStorage.Read('existingFile.txt')

            expect(result).toBeInstanceOf(Readable)
            expect(Fs.createReadStream).toHaveBeenCalledWith('/test/existingFile.txt')
        })

        it('should throw error if no params defined', async () => {
            fsStorage.Params = undefined
            await expect(fsStorage.Read('file.txt')).rejects.toBeInstanceOf(HttpErrorInternalServerError)
        })

        it('should throw not found error if file does not exist and no autocreate', async () => {
            fsStorage.Params = {
                folder: '/test/',
                autocreate: false
            }
            jest.spyOn(fsStorage, 'IsExist').mockResolvedValue(false)

            await expect(fsStorage.Read('nonExistentFile.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })
})