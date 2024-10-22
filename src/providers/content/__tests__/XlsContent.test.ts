
// import { columnLetterToNumber, TXlsContentConfig, XlsContent } from '../XlsContent'
// import * as ExcelJS from 'exceljs'
// import { DataTable } from "../../../types/DataTable"
// import { HttpErrorInternalServerError } from "../../../server/HttpErrors"
// import typia from "typia"
// import { TSourceParams } from "../../../types/TSourceParams"
// import { TFilesDataProviderOptions } from "../../data/FilesDataProvider"


// describe('XlsContent', () => {

//     const randomSourceParams = {
//         ...typia.random<TSourceParams>(),
//         options: typia.random<TXlsContentConfig>()
//     }

//     describe('Init', () => {


//         // Initialize XlsContent with valid buffer and options
//         it('should initialize with valid buffer and options', async () => {
//             const buffer = Buffer.from('test')
//             const options: TFilesDataProviderOptions = {
//                 xlsSheetName: 'Sheet1',
//                 xlsCellDates: true,
//                 xlsDefaultValue: 'N/A',
//                 xlsDateFormat: 'mm/dd/yyyy',
//                 xlsStartingCell: 'B2'
//             }
//             const sourceParams = {
//                 ...typia.random<TSourceParams>(),
//                 options
//             }
//             const xlsContent = new XlsContent(sourceParams)
//             await xlsContent.Init('TestEntity', buffer)
//             expect(xlsContent.EntityName).toBe('TestEntity')
//             expect(xlsContent.Content).toBe(buffer)
//             expect(xlsContent.Config).toEqual(options)
//         })

//         // Verify that the buffer is correctly assigned to the Content property
//         it('should assign buffer to Content property', () => {
//             const contentBuffer = Buffer.from('Test Buffer')
//             const xlsContent = new XlsContent(randomSourceParams)

//             // Call the Init method
//             xlsContent.Init('TestName', contentBuffer)

//             // Assertion
//             expect(xlsContent.Content).toEqual(contentBuffer)
//         })
//     })

//     describe('Get', () => {
//         // Retrieve data from a valid Excel sheet using Get method
//         it('should retrieve data from a valid Excel sheet', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent(randomSourceParams)
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [
//                     {
//                         name: 'Sheet1',
//                         getRow: jest.fn().mockReturnValue({ values: ['Field1'] }),
//                         eachRow: jest.fn()
//                     }
//                 ]
//             }))
//             const dataTable = await xlsContent.Get()
//             expect(dataTable).toBeInstanceOf(DataTable)
//         })

//         // Handle date parsing and formatting correctly when xlsCellDates is true
//         it('should handle date parsing and formatting when xlsCellDates is true', async () => {
//             const buffer = Buffer.from('test')
//             const options = {
//                 xlsCellDates: true,
//                 xlsDateFormat: 'mm/dd/yyyy'
//             }
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [
//                     {
//                         name: 'Sheet1',
//                         getRow: jest.fn().mockReturnValue({ values: ['DateField'] }),
//                         eachRow: jest.fn((_, cb) => cb({ getCell: jest.fn().mockReturnValue({ value: new Date() }) }, 2))
//                     }
//                 ]
//             }))
//             const dataTable = await xlsContent.Get()
//             expect(dataTable.Rows[0].DateField).toBeInstanceOf(Date)
//         })

//         // Use default values for empty cells when xlsDefaultValue is specified
//         it('should use default values for empty cells', async () => {
//             const buffer = Buffer.from('test')
//             const options = { xlsDefaultValue: 'N/A' }
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [
//                     {
//                         name: 'Sheet1',
//                         getRow: jest.fn().mockReturnValue({ values: ['Field1'] }),
//                         eachRow: jest.fn((_, cb) => cb({ getCell: jest.fn().mockReturnValue({ value: null }) }, 2))
//                     }
//                 ]
//             }))
//             const dataTable = await xlsContent.Get()
//             expect(dataTable.Rows[0].Field1).toBe('N/A')
//         })

//         // Handle missing or undefined worksheet gracefully
//         it('should throw error for missing worksheet', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: []
//             }))
//             await expect(xlsContent.Get()).rejects.toThrow(HttpErrorInternalServerError)
//         })

//         // Handle empty or undefined content buffer
//         it('should throw error for empty content buffer', async () => {
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await expect(xlsContent.Get()).rejects.toThrow()
//         })

//         // Handle invalid or non-existent starting cell address
//         it('should throw error for invalid starting cell address', async () => {
//             const buffer = Buffer.from('test')
//             const options = { xlsStartingCell: 'Invalid' }
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [{ name: 'Sheet1' }]
//             }))
//             await expect(xlsContent.Get()).rejects.toThrow()
//         })

//         // Handle invalid or malformed SQL query in Get method
//         it('should throw error for invalid SQL query', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [
//                     {
//                         name: 'Sheet1',
//                         getRow: jest.fn().mockReturnValue({ values: ['Field1'] }),
//                         eachRow: jest.fn()
//                     }
//                 ]
//             }))
//             await expect(xlsContent.Get('INVALID SQL')).rejects.toThrow()
//         })

//         // Handle Excel sheet with no data rows
//         it('should throw error for Excel sheet with no data rows', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [
//                     {
//                         name: 'Sheet1',
//                         getRow: jest.fn().mockReturnValue({ values: [] }),
//                         eachRow: jest.fn()
//                     }
//                 ]
//             }))
//             await expect(xlsContent.Get()).rejects.toThrow(HttpErrorInternalServerError)
//         })


//         // Validate behavior when xlsSheetName is not specified
//         it('should use first sheet when xlsSheetName is not specified', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 worksheets: [{ name: 'FirstSheet' }]
//             }))
//             const dataTable = await xlsContent.Get()
//             expect(dataTable.Name).toBe('TestEntity')
//         })
//     })

//     describe('Set', () => {
//         // Set data into an Excel sheet using Set method
//         it('should set data into an Excel sheet', async () => {
//             const buffer = Buffer.from('test')
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })
//             await xlsContent.Init('TestEntity', buffer)
//             const dataTable = new DataTable('TestEntity', [{ Field1: 'Value1' }])
//             jest.spyOn(ExcelJS.Workbook.prototype, 'xlsx' as any).mockImplementation(() => ({
//                 load: jest.fn().mockResolvedValueOnce(undefined),
//                 writeBuffer: jest.fn().mockResolvedValueOnce(Buffer.from('new content'))
//             }))
//             const resultBuffer = await xlsContent.Set(dataTable)
//             expect(resultBuffer).toBeInstanceOf(Buffer)
//         })

//         it('should handle date formatting when xlsDateFormat is not specified', () => {
//             // Mock ExcelJS Workbook and Worksheet
//             const mockWorkbook = {
//                 xlsx: {
//                     load: jest.fn().mockResolvedValue(undefined),
//                     writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked buffer'))
//                 },
//                 getWorksheet: jest.fn().mockReturnValue(null),
//                 addWorksheet: jest.fn().mockReturnValue({})
//             }
//             jest.mock('exceljs', () => ({
//                 Workbook: jest.fn(() => mockWorkbook)
//             }))

//             const contentDataTable = new DataTable('Test', [{ Date: new Date() }])
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })

//             return xlsContent.Set(contentDataTable).then(() => {
//                 expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled()
//             })
//         })

//         // Test with various data types in Excel cells
//         it('should handle various data types in Excel cells', () => {
//             // Mock ExcelJS Workbook and Worksheet
//             const mockWorkbook = {
//                 xlsx: {
//                     load: jest.fn().mockResolvedValue(undefined),
//                     writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mocked buffer'))
//                 },
//                 getWorksheet: jest.fn().mockReturnValue({})
//             }
//             jest.mock('exceljs', () => ({
//                 Workbook: jest.fn(() => mockWorkbook)
//             }))

//             const contentDataTable = new DataTable('Test', [
//                 {
//                     Number: 123,
//                     String: 'abc',
//                     Date: new Date()
//                 }
//             ])
//             const xlsContent = new XlsContent({
//                 ...randomSourceParams,
//                 options: {}
//             })

//             return xlsContent.Set(contentDataTable).then(() => {
//                 expect(mockWorkbook.xlsx.writeBuffer).toHaveBeenCalled()
//             })
//         })
//     })

//     describe('columnLetterToNumber', () => {
//         // Ensure columnLetterToNumber handles single and multiple letter columns
//         it('should convert column letters to numbers correctly', () => {
//             expect(columnLetterToNumber('A')).toBe(1)
//             expect(columnLetterToNumber('Z')).toBe(26)
//             expect(columnLetterToNumber('AA')).toBe(27)
//             expect(columnLetterToNumber('AZ')).toBe(52)
//             expect(columnLetterToNumber('BA')).toBe(53)
//         })
//     })
// })