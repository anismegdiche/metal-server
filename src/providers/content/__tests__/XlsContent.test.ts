/* eslint-disable init-declarations */
import { Readable } from "node:stream"
import * as ExcelJS from 'exceljs'
import { XlsContent, columnLetterToNumber, TXlsContentConfig } from '../XlsContent'
import { DataTable } from "../../../types/DataTable"
import { HttpErrorInternalServerError } from "../../../server/HttpErrors"
import typia from "typia"
import { TSourceParams } from "../../../types/TSourceParams"


describe("columnLetterToNumber", () => {
    it("should convert a single letter column 'A' to 1", () => {
        expect(columnLetterToNumber('A')).toBe(1)
    })

    it("should convert a two-letter column 'AA' to 27", () => {
        expect(columnLetterToNumber('AA')).toBe(27)
    })

    it("should convert 'ZZ' to the correct column number", () => {
        expect(columnLetterToNumber('ZZ')).toBe(702)
    })
})

describe("XlsContent", () => {
    let xlsContent: XlsContent
    let readableMock: Readable

    const randomSourceParams = {
        ...typia.random<TSourceParams>(),
        options: typia.random<TXlsContentConfig>()
    }

    beforeEach(() => {
        readableMock = new Readable()
        xlsContent = new XlsContent(randomSourceParams)
    })

    describe("Init", () => {
        it("should initialize the content and configuration", async () => {
            const mockOptions: TXlsContentConfig = {
                xlsSheetName: "Sheet1",
                xlsStartingCell: "B2",
                xlsDefaultValue: "N/A",
                xlsCellDates: true,
                xlsDateFormat: "MM-DD-YYYY"
            }

            xlsContent.Options = mockOptions
            await xlsContent.Init("TestEntity", readableMock)

            expect(xlsContent.Config.xlsSheetName).toBe("Sheet1")
            expect(xlsContent.Config.xlsStartingCell).toBe("B2")
            expect(xlsContent.Config.xlsDefaultValue).toBe("N/A")
            expect(xlsContent.Content).toBe(readableMock)
            expect(xlsContent.EntityName).toBe("TestEntity")
        })
    })

    describe("Get", () => {
        it("should throw error when worksheet is not found", async () => {
            jest.mock('exceljs', () => ({ Workbook: jest.fn() }))
            await xlsContent.Init("TestEntity", readableMock)
            await expect(xlsContent.Get()).rejects.toThrow(HttpErrorInternalServerError)
        })

        it("should return DataTable with parsed rows", async () => {
            const mockWorkbook = {
                xlsx: { load: jest.fn() },
                getWorksheet: jest.fn(() => ({
                    getCell: jest.fn(() => ({ address: "A1" })),
                    getRow: jest.fn(() => ({ values: ["Column1", "Column2"] })),
                    eachRow: jest.fn((options, callback) => {
                        callback({ getCell: jest.fn(() => ({ value: "value1" })) }, 2)
                    })
                }))
            }
            jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
            await xlsContent.Init("TestEntity", readableMock)
            const dataTable = await xlsContent.Get()

            expect(dataTable).toBeInstanceOf(DataTable)
            expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith("Sheet1")
            expect(xlsContent.Content).toBeDefined()
        })
    })

    describe("Set", () => {
        it("should set content based on DataTable", async () => {
            const mockWorkbook = {
                xlsx: {
                    load: jest.fn(),
                    write: jest.fn()
                },
                worksheets: [{ getCell: jest.fn(() => ({ address: "A1" })) }]
            }
            const dataTable = new DataTable("TestEntity", [{ field1: "value1" }])
            jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
            await xlsContent.Init("TestEntity", readableMock)
            const result = await xlsContent.Set(dataTable)

            expect(result).toBe(readableMock)
            expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(readableMock)
        })

        it("should throw error when worksheet is not found", async () => {
            const mockWorkbook = {
                xlsx: { load: jest.fn() },
                worksheets: []
            }
            jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
            await xlsContent.Init("TestEntity", readableMock)
            await expect(xlsContent.Set(new DataTable("TestEntity", []))).rejects.toThrow(HttpErrorInternalServerError)
        })
    })
})
