import { FtpStorage } from '../providers/FtpStorage'
import { HttpErrorInternalServerError, HttpErrorNotFound } from '../../../modules/errors/HttpErrors'
import { DataTable } from '../../../types/DataTable'
import * as Ftp from 'basic-ftp'
import { Readable } from 'stream'
import { TConfigSource } from "../../source/types/TConfigSource"
import typia from "typia"

jest.mock('basic-ftp')
jest.mock('../../../utils/Convert')

// Mock the Logger
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: jest.fn(),
        Warn: jest.fn(),
        Error: jest.fn()
    }
}))

const rndParams = typia.random<TConfigSource>()

describe('FtpStorage', () => {
     
    let ftpStorage: FtpStorage
     
    let mockFtpClient: jest.Mocked<Ftp.Client>

    beforeEach(() => {
        mockFtpClient = new Ftp.Client() as jest.Mocked<Ftp.Client>;
        (Ftp.Client as jest.Mock).mockReturnValue(mockFtpClient)
        ftpStorage = new FtpStorage()
        ftpStorage.SetConfig({
            ...rndParams,
            options: {
                "ftp-host": 'localhost',
                "ftp-user": 'user',
                "ftp-password": 'password'
            }
        })
        ftpStorage.Params = {
            host: 'localhost',
            port: 21,
            user: 'user',
            password: 'password',
            secure: false,
            folder: '/'
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Init', () => {
        it('should initialize the FTP client with given options', async () => {
            await ftpStorage.Init()
            expect(ftpStorage.ConfigStorage?.["ftp-host"]).toBe('localhost')
        })
    })

    describe('Connect', () => {
        it('should connect to the FTP server', async () => {
            await ftpStorage.Connect()
            expect(mockFtpClient.access).toHaveBeenCalledWith({
                host: 'localhost',
                user: 'user',
                port: 21,
                password: 'password',
                secure: false
            })
        })

        it('should throw HttpErrorInternalServerError on connection failure', async () => {
            mockFtpClient.access.mockRejectedValue(new HttpErrorInternalServerError('Connection failed'))
            try {
                await ftpStorage.Connect()
            } catch (error: unknown) {
                expect(error).toBe(HttpErrorInternalServerError)
            }
        })
    })

    describe('IsExist', () => {
        it('should return true if the file exists', async () => {
            mockFtpClient.size.mockResolvedValue(1024)
            const exists = await ftpStorage.FileIsExist('', 'test.txt')
            expect(exists).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            mockFtpClient.size.mockRejectedValue(new Error('File not found'))
            const exists = await ftpStorage.FileIsExist('', 'test.txt')
            expect(exists).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return a readable stream of the file content', async () => {
            jest.spyOn(ftpStorage, 'FileIsExist').mockResolvedValue(true)

            mockFtpClient.downloadTo.mockResolvedValue({} as Ftp.FTPResponse)

            const result = await ftpStorage.FileRead('', 'test.txt')
            expect(result).toBeInstanceOf(Readable)
            expect(mockFtpClient.downloadTo).toHaveBeenCalled()
        })

        it('should throw HttpErrorNotFound if file does not exist', async () => {
            jest.spyOn(ftpStorage, 'FileIsExist').mockResolvedValue(false)
            await expect(ftpStorage.FileRead('', 'nonexistent.txt')).rejects.toThrow(HttpErrorNotFound)
        })
    })

    describe('Write', () => {
        // it('should write a file to the FTP server', async () => {
        //     jest.spyOn(ftpStorage, 'IsExist').mockResolvedValue(false)
        //     const mockStream = new Readable()

        //     await ftpStorage.Write('newfile.txt', mockStream)
        //     expect(mockFtpClient.uploadFrom).toHaveBeenCalledWith(mockStream, '/newfile.txt')
        // })

        it('should append to a file if it exists', async () => {
            jest.spyOn(ftpStorage, 'FileIsExist').mockResolvedValue(true)
            const mockStream = new Readable()

            await ftpStorage.FileWrite('', 'existingfile.txt', mockStream)
            expect(mockFtpClient.appendFrom).toHaveBeenCalledWith(mockStream, '/existingfile.txt')
        })

        // it('should throw HttpErrorInternalServerError on write failure', async () => {
        //     const mockStream = new Readable()
        //     mockFtpClient.uploadFrom.mockRejectedValue(new Error('Upload failed'))

        //     await expect(ftpStorage.Write('errorfile.txt', mockStream)).rejects.toThrow(HttpErrorInternalServerError)
        // })
    })

    describe('ListFiles', () => {
        it('should return a DataTable of files', async () => {

            mockFtpClient.list.mockResolvedValue(<Ftp.FileInfo[]>[
                {
                    name: 'file1.txt',
                    type: 1,
                    size: 1000,
                    rawModifiedAt: new Date().toString(),
                    date: new Date().toString(),
                    isDirectory: false
                },
                {
                    name: 'folder',
                    type: 2,
                    size: 0,
                    rawModifiedAt: new Date().toString(),
                    date: new Date(),
                    isDirectory: true
                }
            ])
            const result = await ftpStorage.FolderListFiles()

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    name: 'file1.txt',
                    mimeType: 'text/plain',
                    type: 'file',
                    size: 1000,
                    createdAt: expect.any(Date),
                    modifiedAt: expect.any(Date),
                    path: '\\file1.txt'
                }
            ])
        })

        it('should throw HttpErrorInternalServerError on list failure', async () => {
            mockFtpClient.list.mockRejectedValue(new Error('List failed'))
            await expect(ftpStorage.FolderListFiles()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Disconnect', () => {
        it('should close the FTP client connection', async () => {
            await ftpStorage.Disconnect()
            expect(mockFtpClient.close).toHaveBeenCalled()
        })
    })
})
