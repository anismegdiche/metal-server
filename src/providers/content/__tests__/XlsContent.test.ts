/* eslint-disable init-declarations */
import { Readable } from "node:stream"
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'
import { XlsContent, ColumnLetterToNumber } from '../XlsContent'
import { DataTable } from "../../../types/DataTable"
import { HttpErrorInternalServerError } from "../../../server/HttpErrors"
import * as ExcelJS from 'exceljs'
import typia from "typia"
import { TContentConfig } from "../../data/FilesData"


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


// Mock the Logger decorator
jest.mock('../../../utils//Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: jest.fn()
    }
}))

// Helper function to create a readable stream from string/buffer
function createReadableStream(data: string | Buffer): Readable {
    return new Readable({
        read() {
            this.push(data)
            this.push(null)
        }
    })
}

// Helper function to create a mock Excel workbook
async function createMockWorkbook(data: any[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Sheet1')
    data.forEach(row => worksheet.addRow(row))

    const buffer = await workbook.xlsx.writeBuffer()
    return buffer as Buffer
}

describe('XlsContent', () => {
    let xlsContent: XlsContent
    let mockWorkbookBuffer: Buffer

    beforeEach(async () => {
        // Create mock Excel data
        const mockData = [
            ['Name', 'Age', 'Date'],
            ['John', 30, new Date('2024-01-01')],
            ['Jane', 25, new Date('2024-02-01')]
        ]
        mockWorkbookBuffer = await createMockWorkbook(mockData)

        // Setup XlsContent
        xlsContent = new XlsContent(typia.random<TContentConfig>())
    })


    describe('Init', () => {
        test('should initialize with default parameters', async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {}

            await xlsContent.Init('testEntity', inputStream)

            expect(xlsContent.EntityName).toBe('testEntity')
            expect(xlsContent.Params).toEqual({
                sheet: undefined,
                parseDates: false,
                default: null,
                dateFormat: 'dd/mm/yyyy',
                startingCell: 'A1'
            })
        })

        test('should initialize with custom parameters', async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {
                'xls-sheet': 'Sheet1',
                'xls-parse-dates': true,
                'xls-default': 0,
                'xls-date-format': 'yyyy-mm-dd',
                'xls-starting-cell': 'B2'
            }

            await xlsContent.Init('testEntity', inputStream)

            expect(xlsContent.Params).toEqual({
                sheet: 'Sheet1',
                parseDates: true,
                default: 0,
                dateFormat: 'yyyy-mm-dd',
                startingCell: 'B2'
            })
        })
    })

    describe('Get', () => {
        beforeEach(async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {
                'xls-sheet': 'Sheet1',
                'xls-starting-cell': 'A1'
            }
            await xlsContent.Init('testEntity', inputStream)
        })

        test('should throw error if Params is not defined', async () => {
            xlsContent.Params = undefined
            await expect(xlsContent.Get()).rejects.toThrow(HttpErrorInternalServerError)
        })

        test('should parse Excel data correctly', async () => {
            const result = await xlsContent.Get()

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toHaveLength(2) // Only one data row since first row is header
            expect(result.Rows[0]).toEqual({
                Name: 'John',
                Age: 30,
                Date: expect.any(Date)
            })
        })

        test('should handle SQL queries', async () => {
            const result = await xlsContent.Get('SELECT * FROM testEntity WHERE Age > 25')

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows.length).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Set', () => {
        let mockDataTable: DataTable

        beforeEach(async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {
                'xls-sheet': 'Sheet1',
                'xls-starting-cell': 'A1'
            }
            await xlsContent.Init('testEntity', inputStream)

            mockDataTable = new DataTable('testEntity', [
                {
                    name: 'John',
                    age: 30,
                    date: new Date('2024-01-01')
                }
            ])
        })

        test('should throw error if Params is not defined', async () => {
            xlsContent.Params = undefined
            await expect(xlsContent.Set(mockDataTable)).rejects.toThrow(HttpErrorInternalServerError)
        })

        // test('should write data to Excel correctly', async () => {
        //     const result = await xlsContent.Set(mockDataTable)

        //     expect(result).toBeInstanceOf(Readable)

        //     // Verify the file was uploaded to VFS
        //     const savedFile = virtualFileSystem.ReadFile('testEntity')
        //     expect(savedFile).toBeDefined()

        //     // Read the saved file and verify its contents
        //     const workbook = new ExcelJS.Workbook()
        //     await workbook.xlsx.read(savedFile)
        //     const worksheet = workbook.getWorksheet('Sheet1')

        //     // Verify headers
        //     const headers = worksheet!.getRow(1).values as string[]
        //     expect(headers.slice(1)).toEqual(['name', 'age', 'date'])

        //     // Verify data
        //     const dataRow = worksheet!.getRow(2).values as any[]
        //     expect(dataRow[1]).toBe('John')
        //     expect(dataRow[2]).toBe(30)
        //     expect(dataRow[3]).toBeInstanceOf(Date)
        // })

        // test('should create new worksheet if it doesn\'t exist', async () => {
        //     xlsContent.Config = {
        //         'xls-sheet': 'NewSheet',
        //         'xls-starting-cell': 'A1'
        //     }

        //     const result = await xlsContent.Set(mockDataTable)
        //     expect(result).toBeInstanceOf(Readable)

        //     // Verify the new worksheet was created
        //     const savedFile = virtualFileSystem.ReadFile('testEntity')
        //     const workbook = new ExcelJS.Workbook()
        //     await workbook.xlsx.read(savedFile)

        //     const worksheet = workbook.getWorksheet('NewSheet')
        //     expect(worksheet).toBeDefined()
        // })
    })
})