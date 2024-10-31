//
//
//
//
//
import { Readable } from 'node:stream'
import * as ExcelJS from 'exceljs'
import _ from 'lodash'
//
import { DataTable } from '../../types/DataTable'
import { CommonContent } from './CommonContent'
import { IContent } from '../../types/IContent'
import { Logger } from '../../utils/Logger'
import { TJson } from '../../types/TJson'
import { HttpErrorInternalServerError } from '../../server/HttpErrors'

export type TXlsContentConfig = {
    "xls-sheet"?: string              // Specify which sheet to use, default first sheet
    "xls-starting-cell"?: string      // Specify the starting cell (e.g., 'B2'), default 'A1'
    "xls-default"?: any               // Default value for empty cells
    "xls-parse-dates"?: boolean       // Parse dates from cells, default false
    "xls-date-format"?: string        // Specify the date format for parsing dates
}

// Convert column letter (e.g., 'A', 'B', 'AA') to a column number
export function ColumnLetterToNumber(letter: string): number {
    let column = 0
    const { length } = letter
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < length; i++) {
        // eslint-disable-next-line prefer-exponentiation-operator
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1)
    }
    return column
}

export class XlsContent extends CommonContent implements IContent {
    Config = <TXlsContentConfig>{}

    @Logger.LogFunction(Logger.Debug, true)
    async Init(entity: string, content: Readable): Promise<void> {
        this.EntityName = entity
        if (this.Options) {
            const {
                "xls-sheet": sheet,
                "xls-parse-dates": parseDates = false,
                "xls-default": defaultValue = null,
                "xls-date-format": dateFormat = 'dd/mm/yyyy',
                "xls-starting-cell": startingCell = 'A1'
            } = this.Options

            this.Config = {
                ...this.Config,
                "xls-sheet": sheet,
                "xls-parse-dates": parseDates,
                "xls-default": defaultValue,
                "xls-date-format": dateFormat,
                "xls-starting-cell": startingCell
            }
        }
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Get(sqlQuery: string | undefined = undefined): Promise<DataTable> {

        const workbook = new ExcelJS.Workbook()
        Logger.Debug('XlsContent.Get: reading stream')
        await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))

        Logger.Debug('XlsContent.Get: Converting')
        const sheetName = this.Config["xls-sheet"] ?? workbook.worksheets[0].name
        const worksheet = workbook.getWorksheet(sheetName)
        const {
            "xls-starting-cell": startCell,
            "xls-parse-dates": parseDates,
            "xls-default": defaultValue
        } = this.Config

        if (worksheet == undefined)
            throw new HttpErrorInternalServerError(`Worksheet "${sheetName}" not found in workbook.`)

        const [startCol, startRow] = worksheet.getCell(startCell!).address.match(/[A-Z]+|\d+/g)!
        const colIndex = ColumnLetterToNumber(startCol) // Convert column letter to number

        const fields = _.compact(worksheet.getRow(parseInt(startRow, 10)).values as string[])
        if (fields == undefined || fields.length == 0)
            throw new HttpErrorInternalServerError(`Data in "${sheetName}" not found.`)

        const rows: TJson[] = []
        worksheet.eachRow({ includeEmpty: false }, (sheetRow, sheetRowNumber) => {
            if (sheetRowNumber > parseInt(startRow, 10)) {
                const row: TJson = fields.reduce((_row: TJson, field: string, index: number) => {
                    let cellValue = sheetRow.getCell(colIndex + index).value

                    // Handle date parsing if enabled
                    if (parseDates && cellValue instanceof Date) {
                        cellValue = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(cellValue) // Adjust formatting as needed
                    } else if (parseDates && typeof cellValue === 'string') {
                        // Attempt to parse string as date if parseDates is enabled
                        const parsedDate = new Date(cellValue)
                        if (!isNaN(parsedDate.getTime())) {
                            cellValue = parsedDate // Store as Date object
                        }
                    }

                    _row[field] = cellValue === null
                        ? defaultValue
                        : cellValue

                    return _row
                }, {})
                rows.push(row)
            }
        })
        Logger.Debug('XlsContent.Get: Exporting')
        const dataTable = new DataTable(this.EntityName, rows)
        return await dataTable.FreeSqlAsync(sqlQuery)
    }

    @Logger.LogFunction(Logger.Debug, true)
    async Set(data: DataTable): Promise<Readable> {
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))

        const sheetName = this.Config["xls-sheet"] ?? workbook.worksheets[0].name
        let worksheet = workbook.getWorksheet(sheetName)

        if (!worksheet)
            worksheet = workbook.addWorksheet(sheetName)

        const {
            "xls-starting-cell": startCell,
            "xls-date-format": xlsDateFormat,
            "xls-parse-dates": parseDates
        } = this.Config

        const [startCol, startRow] = worksheet.getCell(startCell!).address.match(/[A-Z]+|\d+/g)!
        const colIndex = ColumnLetterToNumber(startCol) // Convert column letter to number

        // Set headers
        const fields = Object.keys(data.Rows[0])
        fields.forEach((field, colIdx) => {
            worksheet.getCell(parseInt(startRow, 10), colIndex + colIdx).value = field
        })

        // Set data
        data.Rows.forEach((row, rowIndex) => {
            fields.forEach((field: string, fieldIdx: number) => {
                const _rowIdx = parseInt(startRow, 10) + 1 + rowIndex
                const _colIdx: number = colIndex + fieldIdx

                let _valueToSet: any = row[field]

                // If raw data is specified, set directly; otherwise apply formatting or defaults
                if (_valueToSet === null && this.Config["xls-default"] !== undefined) {
                    _valueToSet = this.Config["xls-default"] // Use default value for empty cells
                }

                // Handle date formatting if specified and "xls-parse-dates" is true
                if (parseDates && _valueToSet instanceof Date) {
                    worksheet.getCell(_rowIdx, _colIdx).numFmt = xlsDateFormat! // Apply date format
                }
                worksheet.getCell(_rowIdx, _colIdx).value = _valueToSet     // Set other values directly
            })
        })

        const streamOut: Readable = new Readable()
        await workbook.xlsx.write(streamOut)
        this.Content.UploadFile(this.EntityName, streamOut)
        return this.Content.ReadFile(this.EntityName)
    }
}
