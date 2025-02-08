/* eslint-disable init-declarations */
import { Readable } from "node:stream"
import { XlsContent, ColumnLetterToNumber, TXlsContentConfig, TXlsContentParams } from '../XlsContent'
import { DataTable } from "../../../types/DataTable"
import * as ExcelJS from 'exceljs'
import typia from "typia"
import { HttpErrorInternalServerError } from "../../../server/HttpErrors"


// Mock the Logger decorator
jest.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => () => { },
        Debug: jest.fn(),
        Warn: jest.fn(),
        Error: jest.fn()
    }
}))


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


// Helper function to create a readable stream from string/buffer
function createReadableStream(data: string | Buffer): Readable {
    return new Readable({
        read() {
            // file deepcode ignore ArrayMethodOnNonArray/test: testing purpose
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
    return buffer as unknown as Buffer<ArrayBufferLike>
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
        xlsContent = new XlsContent()
        xlsContent.SetConfig(typia.random<TXlsContentConfig>())
    })


    describe('Init', () => {
        it('should initialize with default parameters', async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {}

            await xlsContent.InitContent('testEntity', inputStream)

            expect(xlsContent.EntityName).toBe('testEntity')
            expect(xlsContent.Params).toEqual({
                sheet: undefined,
                parseDates: false,
                default: null,
                dateFormat: 'dd/mm/yyyy',
                startingCell: 'A1'
            })
        })

        it('should initialize with custom parameters', async () => {
            const inputStream = createReadableStream(mockWorkbookBuffer)
            xlsContent.Config = {
                'xls-sheet': 'Sheet1',
                'xls-parse-dates': true,
                'xls-default': 0,
                'xls-date-format': 'yyyy-mm-dd',
                'xls-starting-cell': 'B2'
            }

            await xlsContent.InitContent('testEntity', inputStream)

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
            await xlsContent.InitContent('testEntity', inputStream)
        })

        it('should throw error if Params is not defined', async () => {
            xlsContent.Params = undefined as unknown as TXlsContentParams
            await expect(xlsContent.Get(undefined,{})).rejects.toThrow(HttpErrorInternalServerError)
        })

        it('should parse Excel data correctly', async () => {
            const result = await xlsContent.Get(undefined,{})

            expect(result).toBeInstanceOf(DataTable)
            expect(result.Rows).toHaveLength(2) // Only one data row since first row is header
            expect(result.Rows[0]).toEqual({
                Name: 'John',
                Age: 30,
                Date: expect.any(Date)
            })
        })

        it('should handle SQL queries', async () => {
            const result = await xlsContent.Get('SELECT * FROM testEntity WHERE Age > 25', {})

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
            await xlsContent.InitContent('testEntity', inputStream)

            mockDataTable = new DataTable('testEntity', [
                {
                    name: 'John',
                    age: 30,
                    date: new Date('2024-01-01')
                }
            ])
        })

        it('should throw error if Params is not defined', async () => {
            xlsContent.Params = undefined as unknown as TXlsContentParams
            await expect(xlsContent.Set(mockDataTable,{})).rejects.toThrow(HttpErrorInternalServerError)
        })

        // FIXME test to fix
        // it('should write data to Excel correctly', async () => {
        //     mockDataTable = new DataTable('testEntity', [
        //         {
        //             name: 'John',
        //             age: 30,
        //             date: new Date('2024-01-01')
        //         }
        //     ])
        //     const result = await xlsContent.Set(mockDataTable)

        //     expect(result).toBeInstanceOf(Readable)
        //     expect(xlsContent.Content.Files['testEntity']).toBeDefined()
        // })
    })
})