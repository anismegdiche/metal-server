import * as Fs from 'fs'
import { vi, type Mock } from 'vitest'

import { Readable } from 'node:stream'
import type { TConfigSource } from "../../source/types/TConfigSource"
import { FsStorage } from '../providers/FsStorage'
import { ReadableUtils } from '../../../utils/ReadableUtils'
import { HttpErrorNotFound, HttpErrorInternalServerError } from '../../../modules/errors/HttpErrors'
import { ReadStream } from "node:fs"
import { DATA_PROVIDER } from "../../source/@consts"

vi.mock('fs', async () => {
    const actual = await vi.importActual<typeof import('fs')>('fs')
    return {
        ...actual,
        existsSync: vi.fn(),
        createReadStream: vi.fn(),
        promises: {
            ...actual.promises,
            writeFile: vi.fn(),
            readdir: vi.fn()
        }
    }
})

type FsMock = typeof Fs & {
    existsSync: Mock
    createReadStream: Mock
    promises: typeof Fs.promises & {
        writeFile: Mock
        readdir: Mock
    }
}

const fsMock = Fs as unknown as FsMock

describe('FsStorage', () => {
    const sourceConfig = <TConfigSource>{
        provider: DATA_PROVIDER.STORAGE,
        options: {
            "fs-folder": './'
        }
    }
    const fsStorage = new FsStorage()
    fsStorage.SetConfig(sourceConfig)
    fsStorage.Init()

    beforeEach(() => {
        vi.clearAllMocks()
        fsMock.existsSync.mockReset()
        fsMock.createReadStream.mockReset()
        fsMock.promises.writeFile.mockReset()
        fsMock.promises.readdir.mockReset()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('IsExist', () => {
        it('should return true if the file exists', async () => {
            fsMock.existsSync.mockReturnValue(true)

            const result = await fsStorage.FileIsExist('', 'IsExist.txt')

            expect(result).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            fsMock.existsSync.mockReturnValue(false)

            const result = await fsStorage.FileIsExist('', 'IsExist-ko.txt')

            expect(result).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return the content of the file if it exists', async () => {
            fsMock.createReadStream.mockReturnValue(Readable.from('File content', { encoding: 'utf8' }) as ReadStream)
            vi.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(true)

            const result = await fsStorage.FileRead('', 'Read.txt')

            const content = await ReadableUtils.ToString(result)
            expect(content).toBe('File content')
        })

        it('should throw Not Found if the file does not exist', async () => {
            vi.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(false)

            await expect(fsStorage.FileRead('', 'Read-ko.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        it('should write the content to the file', async () => {
            fsMock.promises.writeFile.mockResolvedValue(undefined)

            const stream = Readable.from('File content')

            await fsStorage.FileWrite('', 'Write.txt', stream)

            expect(fsMock.promises.writeFile).toHaveBeenCalledWith(
                'Write.txt',
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
            vi.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(true)
            fsMock.createReadStream.mockReturnValue(Readable.from('', { encoding: 'utf8' }) as ReadStream)

            const result = await fsStorage.FileRead('', 'existingFile.txt')

            expect(result).toBeInstanceOf(Readable)
            expect(fsMock.createReadStream).toHaveBeenCalledWith('/test/existingFile.txt')
        })

        it('should throw error if no params defined', async () => {
            fsStorage.Params = undefined
            await expect(fsStorage.FileRead('', 'file.txt')).rejects.toBeInstanceOf(HttpErrorInternalServerError)
        })

        it('should throw not found error if file does not exist and no autocreate', async () => {
            fsStorage.Params = {
                folder: '/test/',
                autocreate: false
            }
            vi.spyOn(fsStorage, 'FileIsExist').mockResolvedValue(false)

            await expect(fsStorage.FileRead('', 'nonExistentFile.txt')).rejects.toBeInstanceOf(HttpErrorNotFound)
        })
    })
})