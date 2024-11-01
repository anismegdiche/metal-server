// import { Readable } from "node:stream"
// import Smb2 from "smb2"
// import { SmbStorage } from "../SmbStorage"
// import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../server/HttpErrors"
// import { ReadableHelper } from "../../../lib/ReadableHelper"
// import { TConfigSource } from "../../../types/TConfig"
// import typia from "typia"
// import DATA_PROVIDER from "../../../server/Source"
// import { STORAGE } from "../../data/FilesDataProvider"

// // Mock the smb2 module
// jest.mock("smb2")
// jest.mock("../../../lib/ReadableHelper")

// describe("SmbStorage", () => {
//     // eslint-disable-next-line init-declarations
//     let storage: SmbStorage
//     const mockConfig = <TConfigSource>{
//         ...typia.random<TConfigSource>(),
//         provider: DATA_PROVIDER.FILES,
//         options: {
//             storage: STORAGE.SMB,
//             smbShare: "\\\\server\\share",
//             smbDomain: "domain",
//             smbUsername: "user",
//             smbPassword: "pass",
//             smbPath: "/test/path"
//         }
//     }

//     // Mock SMB client implementation
//     const mockSmb2Client = {
//         exists: jest.fn(),
//         readFile: jest.fn(),
//         writeFile: jest.fn(),
//         readdir: jest.fn(),
//         close: jest.fn()
//     }

//     beforeEach(() => {
//         // Reset all mocks
//         jest.clearAllMocks()

//             // Setup the mock implementation for Smb2 constructor
//             // eslint-disable-next-line semi-style
//             ; (Smb2 as jest.MockedClass<typeof Smb2>).mockImplementation(() => mockSmb2Client as any)

//         // Initialize storage with test config
//         storage = new SmbStorage(mockConfig)
//         storage.Init()
//     })

//     describe("Init", () => {
//         it("should initialize with correct configuration", () => {
//             expect(storage["Config"]).toEqual({
//                 smbShare: mockConfig.options!.smbShare,
//                 smbDomain: mockConfig.options!.smbDomain,
//                 smbUsername: mockConfig.options!.smbUsername,
//                 smbPassword: mockConfig.options!.smbPassword,
//                 smbPath: mockConfig.options!.smbPath
//             })
//         })

//         it("should use default values for optional parameters", () => {
//             const minimalConfig = {
//                 smbShare: "\\\\server\\share",
//                 smbUsername: "user",
//                 smbPassword: "pass"
//             }
//             const minimalStorage = new SmbStorage({
//                 ...mockConfig,
//                 options: minimalConfig
//             })

//             minimalStorage.Init()

//             expect(minimalStorage["Config"]).toEqual({
//                 ...minimalConfig,
//                 smbDomain: "",
//                 smbPath: ""
//             })
//         })
//     })

//     describe("Connect", () => {
//         it("should initialize SMB client with correct configuration", async () => {
//             await storage.Connect()

//             expect(Smb2).toHaveBeenCalledWith({
//                 share: mockConfig.options!.smbShare,
//                 domain: mockConfig.options!.smbDomain,
//                 username: mockConfig.options!.smbUsername,
//                 password: mockConfig.options!.smbPassword
//             })
//         })

//         it("should handle connection errors gracefully", async () => {
//             const errorMessage = "Connection failed";
//             (Smb2 as jest.MockedClass<typeof Smb2>).mockImplementationOnce(() => {
//                 throw new Error(errorMessage)
//             })

//             await storage.Connect()
//             // Verify the error was logged (you might need to mock your Logger here)
//         })
//     })

//     describe("Disconnect", () => {
//         it("should close the SMB client connection", async () => {
//             await storage.Connect()
//             await storage.Disconnect()

//             expect(mockSmb2Client.close).toHaveBeenCalled()
//         })

//         it("should handle disconnect when client is not initialized", async () => {
//             await storage.Disconnect()
//             expect(mockSmb2Client.close).not.toHaveBeenCalled()
//         })
//     })

//     describe("IsExist", () => {
//         beforeEach(async () => {
//             await storage.Connect()
//         })

//         it("should return true when file exists", async () => {
//             mockSmb2Client.exists.mockImplementation((path, callback) => callback(null, true))

//             const result = await storage.IsExist("test.txt")
//             expect(result).toBe(true)
//         })

//         it("should return false when file does not exist", async () => {
//             mockSmb2Client.exists.mockImplementation((path, callback) => callback(null, false))

//             const result = await storage.IsExist("nonexistent.txt")
//             expect(result).toBe(false)
//         })

//         it("should throw error when client is not initialized", async () => {
//             await storage.Disconnect()
//             await expect(storage.IsExist("test.txt")).rejects.toThrow(HttpErrorInternalServerError)
//         })
//     })

//     describe("Read", () => {
//         beforeEach(async () => {
//             await storage.Connect()
//         })

//         it("should read file successfully", async () => {
//             const fileContent = "test content"
//             mockSmb2Client.exists.mockImplementation((path, callback) => callback(null, true))
//             mockSmb2Client.readFile.mockImplementation((path, callback) => callback(null, fileContent))

//             const result = await storage.Read("test.txt")
//             expect(result).toBeInstanceOf(Readable)
//         })

//         it("should throw NotFound error when file does not exist", async () => {
//             mockSmb2Client.exists.mockImplementation((path, callback) => callback(null, false))

//             await expect(storage.Read("nonexistent.txt")).rejects.toThrow(HttpErrorNotFound)
//         })

//         it("should throw error when client is not initialized", async () => {
//             await storage.Disconnect()
//             await expect(storage.Read("test.txt")).rejects.toThrow(HttpErrorInternalServerError)
//         })
//     })

//     describe("Write", () => {
//         beforeEach(async () => {
//             await storage.Connect()
//         })

//         it("should write file successfully", async () => {
//             const content = Readable.from("test content");
//             (ReadableHelper.ToString as jest.Mock).mockResolvedValue("test content")
//             mockSmb2Client.writeFile.mockImplementation((path, content, callback) => callback(null))

//             await expect(storage.Write("test.txt", content)).resolves.not.toThrow()
//             expect(mockSmb2Client.writeFile).toHaveBeenCalled()
//         })

//         it("should throw error when client is not initialized", async () => {
//             const content = Readable.from("test content")
//             await storage.Disconnect()
//             await expect(storage.Write("test.txt", content)).rejects.toThrow(HttpErrorInternalServerError)
//         })

//         it("should handle write errors", async () => {
//             const content = Readable.from("test content");
//             (ReadableHelper.ToString as jest.Mock).mockResolvedValue("test content")
//             mockSmb2Client.writeFile.mockImplementation((path, content, callback) => callback(new Error("Write failed"))
//             )

//             await expect(storage.Write("test.txt", content)).rejects.toThrow(HttpErrorInternalServerError)
//         })
//     })

//     describe("List", () => {
//         beforeEach(async () => {
//             await storage.Connect()
//         })

//         it("should list files successfully", async () => {
//             const mockFiles = ["file1.txt", "file2.txt"]
//             mockSmb2Client.readdir.mockImplementation((path, callback) => callback(null, mockFiles))

//             const result = await storage.List()
//             expect(result.Rows).toEqual(mockFiles.map(file => ({
//                 name: file,
//                 type: "file"
//             })))
//         })

//         it("should throw error when client is not initialized", async () => {
//             await storage.Disconnect()
//             await expect(storage.List()).rejects.toThrow(HttpErrorInternalServerError)
//         })

//         it("should handle listing errors", async () => {
//             mockSmb2Client.readdir.mockImplementation((path, callback) => callback(new Error("Listing failed"))
//             )

//             await expect(storage.List()).rejects.toThrow(HttpErrorInternalServerError)
//         })
//     })
// })