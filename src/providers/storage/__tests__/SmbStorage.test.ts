import { Readable } from "node:stream"
import { HttpErrorNotFound, HttpErrorInternalServerError } from "../../../server/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { SmbStorage } from "../SmbStorage"
import typia from "typia"
import { TConfigSource } from "../../../types/TConfig"
import DATA_PROVIDER from "../../../server/Source"
import { STORAGE } from "../../data/FilesDataProvider"

const rndSourceConfig = <TConfigSource>{
    ...typia.random<TConfigSource>(),
    provider: DATA_PROVIDER.FILES,
    options: {
        storage: STORAGE.SMB
    }
}

describe('SmbStorage', () => {
    const options = {
        ...rndSourceConfig.options,
        smbShare: '\\\\server\\share',
        smbUsername: 'user',
        smbPassword: 'pass'
    }

    // Successfully initialize SMB client with valid configuration
    it('should initialize SMB client with valid configuration', () => {
        
        const smbStorage = new SmbStorage({
            ...rndSourceConfig,
            options
        })
        smbStorage.Init()
        expect(smbStorage.Config.smbShare).toBe(options.smbShare)
        expect(smbStorage.Config.smbUsername).toBe(options.smbUsername)
        expect(smbStorage.Config.smbPassword).toBe(options.smbPassword)
    })

    // Connect to SMB server without errors
    it('should connect to SMB server without errors', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await expect(smbStorage.Connect()).resolves.not.toThrow()
    })

    // Disconnect from SMB server gracefully
    it('should disconnect from SMB server gracefully', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()
        await expect(smbStorage.Disconnect()).resolves.not.toThrow()
    })

    // Check if a file exists on the SMB server
    it('should check if a file exists on the SMB server', async () => {
        const smbStorage = new SmbStorage({
            ...rndSourceConfig,
            options
        })
        smbStorage.Init()
        await smbStorage.Connect()
        const exists = await smbStorage.IsExist('test.txt')
        expect(exists).toBe(true)
    },300_000)

    // Read a file from the SMB server if it exists
    it('should read a file from the SMB server if it exists', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()
        const readable = await smbStorage.Read('test.txt')
        expect(readable).toBeInstanceOf(Readable)
    })

    // Write a file to the SMB server without errors
    it('should write a file to the SMB server without errors', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()
        const content = Readable.from(['Hello World'])
        await expect(smbStorage.Write('test.txt', content)).resolves.not.toThrow()
    })

    // Attempt to connect with invalid credentials
    it('should fail to connect with invalid credentials', async () => {
        const smbStorage = new SmbStorage(<TConfigSource>{})
        smbStorage.Init()
        await expect(smbStorage.Connect()).rejects.toThrow()
    })

    // Try to read a non-existent file
    it('should throw error when reading a non-existent file', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()
        await expect(smbStorage.Read('nonexistent.txt')).rejects.toThrow(HttpErrorNotFound)
    })

    // Write to a file when SMB client is not initialized
    it('should throw error when writing without initializing SMB client', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        const content = Readable.from(['Hello World'])
        await expect(smbStorage.Write('test.txt', content)).rejects.toThrow(HttpErrorInternalServerError)
    })

    // List files when SMB client is not initialized
    it('should throw error when listing files without initializing SMB client', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        await expect(smbStorage.List()).rejects.toThrow(HttpErrorInternalServerError)
    })

    // Handle network interruptions during file operations
    it('should handle network interruptions during file operations gracefully', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()

        jest.spyOn(smbStorage, 'Read').mockImplementation(() => {
            throw new Error('Network interruption')
        })

        await expect(smbStorage.Read('test.txt')).rejects.toThrow('Network interruption')
    })

    // List files in the specified SMB path
    it('should list files in the specified SMB path', async () => {
        const smbStorage = new SmbStorage(rndSourceConfig)
        smbStorage.Init()
        await smbStorage.Connect()

        jest.spyOn(smbStorage, 'List').mockResolvedValue(new DataTable("", [
            {
                name: "file1.txt",
                type: "file"
            }
        ]))

        const dataTable = await smbStorage.List()
        expect(dataTable.Rows.length).toBeGreaterThan(0)
        expect(dataTable.Rows[0].name).toBe("file1.txt")
    })
})
