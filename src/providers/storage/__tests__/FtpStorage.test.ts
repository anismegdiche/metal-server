import { FtpStorage } from '../FtpStorage'
import { HttpErrorInternalServerError, HttpErrorNotFound } from '../../../server/HttpErrors'
import { DataTable } from '../../../types/DataTable'
import * as Ftp from 'basic-ftp'
import { Readable } from 'stream'
import { TSourceParams } from "../../../types/TSourceParams"
import typia from "typia"

jest.mock('basic-ftp')
jest.mock('../../../lib/Convert')

const rndParams = typia.random<TSourceParams>()

describe('FtpStorage', () => {
    // eslint-disable-next-line init-declarations
    let ftpStorage: FtpStorage
    // eslint-disable-next-line init-declarations
    let mockFtpClient: jest.Mocked<Ftp.Client>

    beforeEach(() => {
        mockFtpClient = new Ftp.Client() as jest.Mocked<Ftp.Client>;
        (Ftp.Client as jest.Mock).mockReturnValue(mockFtpClient)
        ftpStorage = new FtpStorage({
            ...rndParams,
            options: {
                ftpHost: 'localhost',
                ftpUser: 'user',
                ftpPassword: 'password'
            }
        })
        ftpStorage.Config = {
            ftpHost: 'localhost',
            ftpUser: 'user',
            ftpPassword: 'password',
            ftpSecure: false,
            ftpRemoteFolder: '/'
        }
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('Init', () => {
        it('should initialize the FTP client with given options', async () => {
            await ftpStorage.Init()
            expect(ftpStorage.Config.ftpHost).toBe('localhost')
        })
    })

    describe('Connect', () => {
        it('should connect to the FTP server', async () => {
            await ftpStorage.Connect()
            expect(mockFtpClient.access).toHaveBeenCalledWith({
                host: 'localhost',
                user: 'user',
                password: 'password',
                secure: false
            })
        })

        it('should throw HttpErrorInternalServerError on connection failure', async () => {
            mockFtpClient.access.mockRejectedValue(new Error('Connection failed'))
            await expect(ftpStorage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('IsExist', () => {
        it('should return true if the file exists', async () => {
            mockFtpClient.size.mockResolvedValue(1024)
            const exists = await ftpStorage.IsExist('test.txt')
            expect(exists).toBe(true)
        })

        it('should return false if the file does not exist', async () => {
            mockFtpClient.size.mockRejectedValue(new Error('File not found'))
            const exists = await ftpStorage.IsExist('test.txt')
            expect(exists).toBe(false)
        })
    })

    describe('Read', () => {
        it('should return a readable stream of the file content', async () => {
            jest.spyOn(ftpStorage, 'IsExist').mockResolvedValue(true)
            const mockStream = Readable.from('file content')

            mockFtpClient.downloadTo.mockResolvedValue({} as Ftp.FTPResponse)

            const result = await ftpStorage.Read('test.txt')
            expect(result).toBeInstanceOf(Readable)
            expect(mockFtpClient.downloadTo).toHaveBeenCalled()
        })

        it('should throw HttpErrorNotFound if file does not exist', async () => {
            jest.spyOn(ftpStorage, 'IsExist').mockResolvedValue(false)
            await expect(ftpStorage.Read('nonexistent.txt')).rejects.toThrow(HttpErrorNotFound)
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
            jest.spyOn(ftpStorage, 'IsExist').mockResolvedValue(true)
            const mockStream = new Readable()

            await ftpStorage.Write('existingfile.txt', mockStream)
            expect(mockFtpClient.appendFrom).toHaveBeenCalledWith(mockStream, '/existingfile.txt')
        })

        // it('should throw HttpErrorInternalServerError on write failure', async () => {
        //     const mockStream = new Readable()
        //     mockFtpClient.uploadFrom.mockRejectedValue(new Error('Upload failed'))

        //     await expect(ftpStorage.Write('errorfile.txt', mockStream)).rejects.toThrow(HttpErrorInternalServerError)
        // })
    })

    describe('List', () => {
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
            const result = await ftpStorage.List()

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                {
                    name: 'file1.txt',
                    type: 'file',
                    size: 1000
                }
            ])
        })

        it('should throw HttpErrorInternalServerError on list failure', async () => {
            mockFtpClient.list.mockRejectedValue(new Error('List failed'))
            await expect(ftpStorage.List()).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe('Disconnect', () => {
        it('should close the FTP client connection', async () => {
            await ftpStorage.Disconnect()
            expect(mockFtpClient.close).toHaveBeenCalled()
        })
    })
})
