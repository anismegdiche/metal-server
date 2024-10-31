/* eslint-disable init-declarations */
import { Readable } from "node:stream"
import { XlsContent, ColumnLetterToNumber, TXlsContentConfig } from '../XlsContent'
import { DataTable } from "../../../types/DataTable"
import { HttpErrorInternalServerError } from "../../../server/HttpErrors"
import typia from "typia"
import * as ExcelJS from 'exceljs'


describe("ColumnLetterToNumber", () => {
    it("should convert a single letter column 'A' to 1", () => {
        expect(ColumnLetterToNumber('A')).toBe(1)
    })

    it("should convert a two-letter column 'AA' to 27", () => {
        expect(ColumnLetterToNumber('AA')).toBe(27)
    })

    it("should convert 'ZZ' to the correct column number", () => {
        expect(ColumnLetterToNumber('ZZ')).toBe(702)
    })
})

// describe("XlsContent", () => {
//     let xlsContent: XlsContent
//     let readableMock: Readable

//     const rndContentConfig = typia.random<TXlsContentConfig>()

//     const stream = new Readable()

//     beforeEach(async () => {
//         readableMock = new Readable()
//         xlsContent = new XlsContent(rndContentConfig)
//         //generate xlsx
//         const workbook = new ExcelJS.Workbook()

//         // Add a new sheet
//         const worksheet = workbook.addWorksheet('My Sheet')

//         // Add column headers
//         worksheet.columns = [
//             {
//                 header: 'Name',
//                 key: 'name',
//                 width: 30
//             },
//             {
//                 header: 'Age',
//                 key: 'age',
//                 width: 10
//             },
//             {
//                 header: 'City',
//                 key: 'city',
//                 width: 20
//             }
//         ]

//         // Add some rows
//         worksheet.addRow({
//             name: 'John Doe',
//             age: 30,
//             city: 'New York'
//         })
//         worksheet.addRow({
//             name: 'Jane Smith',
//             age: 25,
//             city: 'Los Angeles'
//         })

//         // Write to buffer instead of file        
//         await workbook.xlsx.write(stream)

//     })

//     describe("Init", () => {
//         it("should initialize the content and configuration", async () => {
//             const name = "TestEntity"
//             const mockOptions: TXlsContentConfig = {
//                 xls-sheet: "Sheet1",
//                 xls-starting-cell: "B2",
//                 xls-default: "N/A",
//                 xls-parse-dates: true,
//                 xls-date-format: "MM-DD-YYYY"
//             }

//             xlsContent.Options = mockOptions
//             await xlsContent.Init(name, readableMock)

//             expect(xlsContent.Config.xls-sheet).toBe("Sheet1")
//             expect(xlsContent.Config.xls-starting-cell).toBe("B2")
//             expect(xlsContent.Config.xls-default).toBe("N/A")
//             expect(xlsContent.Content.ReadFile(name)).toBe(readableMock)
//             expect(xlsContent.EntityName).toBe("TestEntity")
//         })
//     })

//     describe("Get", () => {
//         // it("should throw error when worksheet is not found", async () => {
//         //     const name = "TestEntity"
//         //     jest.mock('exceljs', () => ({ Workbook: jest.fn() }))
//         //     await xlsContent.Init(name, readableMock)
//         //     await expect(xlsContent.Get()).rejects.toThrow(Error)
//         // })

//         it("should return DataTable with parsed rows", async () => {
//             // const mockWorkbook = {
//             //     xlsx: { load: jest.fn() },
//             //     getWorksheet: jest.fn(() => ({
//             //         getCell: jest.fn(() => ({ address: "A1" })),
//             //         getRow: jest.fn(() => ({ values: ["Column1", "Column2"] })),
//             //         eachRow: jest.fn((options, callback) => {
//             //             callback({ getCell: jest.fn(() => ({ value: "value1" })) }, 2)
//             //         })
//             //     }))
//             // }
//             // jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
//             await xlsContent.Init("TestEntity", stream)
//             const dataTable = await xlsContent.Get()

//             expect(dataTable).toBeInstanceOf(DataTable)
//             // expect(mockWorkbook.getWorksheet).toHaveBeenCalledWith("Sheet1")
//             expect(xlsContent.Content).toBeDefined()
//         })
//     })

//     describe("Set", () => {
//         it("should set content based on DataTable", async () => {
//             const mockWorkbook = {
//                 xlsx: {
//                     load: jest.fn(),
//                     write: jest.fn()
//                 },
//                 worksheets: [{ getCell: jest.fn(() => ({ address: "A1" })) }]
//             }
//             const dataTable = new DataTable("TestEntity", [{ field1: "value1" }])
//             jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
//             await xlsContent.Init("TestEntity", readableMock)
//             const result = await xlsContent.Set(dataTable)

//             expect(result).toBe(readableMock)
//             expect(mockWorkbook.xlsx.write).toHaveBeenCalledWith(readableMock)
//         })

//         it("should throw error when worksheet is not found", async () => {
//             const mockWorkbook = {
//                 xlsx: { load: jest.fn() },
//                 worksheets: []
//             }
//             jest.mock('exceljs', () => ({ Workbook: jest.fn(() => mockWorkbook) }))
//             await xlsContent.Init("TestEntity", readableMock)
//             await expect(xlsContent.Set(new DataTable("TestEntity", []))).rejects.toThrow(HttpErrorInternalServerError)
//         })
//     })
// })
