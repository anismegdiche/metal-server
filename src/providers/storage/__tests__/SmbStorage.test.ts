/* eslint-disable init-declarations */
import { Readable } from "node:stream"
import { SmbStorage } from "../SmbStorage"
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../../../server/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import typia from "typia"
import { TConfigSource } from "../../../types/TConfig"

jest.mock("smb2", () => {
    return jest.fn().mockImplementation(() => ({
        exists: () => true,
        readFile: () => Readable.from("test content"),
        writeFile: () => true,
        readdir: () => []
    }))
})

const rndParams = typia.random<TConfigSource>()

describe("SmbStorage", () => {
    let storage: SmbStorage

    beforeEach(() => {
        storage = new SmbStorage()
        storage.SetConfig({
            ...rndParams,
            options: {
                "smb-share": "//server/share",
                "smb-username": "testuser",
                "smb-password": "testpass",
                "smb-domain": "testdomain"
            }
        })
    })

    describe("Init", () => {
        it("should throw error if ConfigStorage is not defined", () => {
            storage.ConfigStorage = undefined
            expect(() => storage.Init()).toThrow(HttpErrorInternalServerError)
        })

        it("should initialize params correctly", () => {
            storage.Init()
            expect(storage.Params).toEqual({
                share: "//server/share",
                username: "testuser",
                password: "testpass",
                domain: "testdomain"
            })
        })

        it("should handle optional domain parameter", () => {
            storage.SetConfig({
                ...rndParams,
                options: {
                    "smb-share": "//server/share",
                    "smb-username": "testuser",
                    "smb-password": "testpass"
                }
            })
            storage.Init()
            expect(storage.Params?.domain).toBe("")
        })
    })

    describe("GetFilePath", () => {
        it("should throw error if params not defined", () => {
            storage.Params = undefined
            expect(() => storage.GetFilePath("test.txt")).toThrow(HttpErrorInternalServerError)
        })

        it("should return correct path with forward slashes", () => {
            storage.Init()
            const result = storage.GetFilePath("test.txt")
            if (process.platform === 'darwin') {
                expect(result).toBe("/server/share/test.txt")
            } else {
                expect(result).toBe("//server/share/test.txt")
            }
        })
    })

    describe("Connect", () => {
        it("should throw error if params not defined", async () => {
            storage.Params = undefined
            await expect(storage.Connect()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should initialize SMB client with correct params", async () => {
            storage.Init()
            await storage.Connect()
            expect(storage.SmbClient).toBeDefined()
        })
    })

    describe("IsExist", () => {
        it("should throw error if client not initialized", async () => {
            storage.Init()
            await expect(storage.IsExist("test.txt")).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe("Read", () => {
        it("should throw error if client not initialized", async () => {
            storage.Init()
            await expect(storage.Read("test.txt")).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should throw error if file does not exist", async () => {
            storage.Init()
            await storage.Connect()
            // Mock IsExist to return false
            jest.spyOn(storage, "IsExist").mockResolvedValue(false)
            await expect(storage.Read("nonexistent.txt")).rejects.toThrow(HttpErrorNotFound)
        })
    })

    describe("Write", () => {
        it("should throw error if client not initialized", async () => {
            storage.Init()
            const content = Readable.from("test content")
            await expect(storage.Write("test.txt", content)).rejects.toThrow(HttpErrorInternalServerError)
        })
    })

    describe("List", () => {
        it("should throw error if client not initialized", async () => {
            storage.Init()
            await expect(storage.List()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should throw error if params not defined", async () => {
            storage.Init()
            await storage.Connect()
            storage.Params = undefined
            await expect(storage.List()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should return DataTable with correct structure", async () => {
            storage.Init()
            await storage.Connect()
            // Mock readdir to return some files
            const mockFiles = ["file1.txt", "file2.txt"]
            jest.spyOn(storage.SmbClient!, "readdir").mockImplementation((path, callback?: (error: unknown, files: string[]) => void) => {
                if (callback) callback(null, mockFiles)
            })

            const result = await storage.List()
            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toEqual([
                { name: "file1.txt", type: "file" },
                { name: "file2.txt", type: "file" }
            ])
        })
    })
})
