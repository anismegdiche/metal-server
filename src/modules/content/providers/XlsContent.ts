//
//
//
import { Readable } from 'node:stream'
// Lazy-loaded module
import _ from 'lodash'
import typia from "typia"
//
import { DataTable } from '../../../types/DataTable'
import { Logger } from '../../../utils/Logger'
import { TJson } from '../../../types/TJson'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { absContentProvider } from "../base/absContentProvider"
import { TContext } from "../../sandbox/types/TContext"
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { Sandbox } from "../../sandbox/Sandbox"
import { TXlsContentConfig } from '../types/TXlsContentConfig'
import { TXlsContentParams } from '../types/TXlsContentParams'
import { Assert } from '../../../utils/Assert'
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'


// Convert column letter (e.g., 'A', 'B', 'AA') to a column number
export function ColumnLetterToNumber(letter: string): number {
    let column = 0
    const { length } = letter
     
    for (let i = 0; i < length; i++) {         
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1)
    }
    
    return column
}


//
export class XlsContent extends absContentProvider {

    Params: TXlsContentParams = {
        parseDates: false,
        default: null,
        dateFormat: 'dd/mm/yyyy',
        startingCell: 'A1'
    }

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && typia.is<TXlsContentConfig>(this.Config)) {
            this.Params = _.merge(
                this.Params,
                {
                    sheet: this.Config["xls-sheet"],
                    parseDates: this.Config["xls-parse-dates"],
                    default: this.Config["xls-default"],
                    dateFormat: this.Config["xls-date-format"],
                    startingCell: this.Config["xls-starting-cell"]
                }
            )
        }
        this.Content.UploadFile(entity, content)
    }

    private static _excelJsModule: typeof import('exceljs');
    private static async _loadExcelJsModule(): Promise<typeof import('exceljs')> {
        if (!this._excelJsModule) {
            this._excelJsModule = await import('exceljs');
        }
        return this._excelJsModule;
    }

    @Logger.LogFunction(['$context'])
    async Get(sqlQuery: string | undefined, $context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<TXlsContentParams>(this.Params, 
            typia.is<TXlsContentParams>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const ExcelJS = await XlsContent._loadExcelJsModule();
        const workbook = new ExcelJS.Workbook()
        Logger.Debug('XlsContent.Get: reading stream')
        await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))

        const $__evalParams = PlaceHolder.EvaluateJsCode<TXlsContentParams>(
            this.Params,
            new Sandbox($context)
        )

        Logger.Debug('XlsContent.Get: Converting')
        const sheetName = $__evalParams!.sheet ?? workbook.worksheets[0].name
        const worksheet = workbook.getWorksheet(sheetName)

        if (worksheet == undefined)
            throw new HttpErrorInternalServerError(`Worksheet "${sheetName}" not found in workbook.`)

        const [startCol, startRow] = worksheet
            .getCell($__evalParams!.startingCell!)
            .address
            .match(/[A-Z]+|\d+/g)!

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
                    if ($__evalParams!.parseDates && cellValue instanceof Date) {
                        cellValue = new Intl.DateTimeFormat('en-US', { dateStyle: 'short' }).format(cellValue) // Adjust formatting as needed
                    } else if ($__evalParams!.parseDates && typeof cellValue === 'string') {
                        // Attempt to parse string as date if evalParams.parseDates is enabled
                        const _parsedDate = new Date(cellValue)
                        if (!Number.isNaN(_parsedDate.getTime())) {
                            cellValue = _parsedDate // Store as Date object
                        }
                    }

                    _row[field] = cellValue === null
                        ? $__evalParams!.default
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

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context?: Partial<TContext>): Promise<Readable> {
        Assert.Var<TXlsContentParams>(this.Params, 
            typia.is<TXlsContentParams>(this.Params),
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content, 
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const ExcelJS = await XlsContent._loadExcelJsModule();
        const workbook = new ExcelJS.Workbook()
        
        // Try to read the existing file, but create a new workbook if it fails
        try {
            await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))
        } catch {
            Logger.Warn('XlsContent.Set: Could not read existing file, creating new workbook')
        }

        const $__evalParams = PlaceHolder.EvaluateJsCode<TXlsContentParams>(
            this.Params,
            new Sandbox($context)
        )

        const sheetName = $__evalParams?.sheet ?? workbook.worksheets[0]?.name ?? 'Sheet1'
        let worksheet = workbook.getWorksheet(sheetName)

        if (!worksheet) {
            worksheet = workbook.addWorksheet(sheetName)
            worksheet.properties.defaultRowHeight = 15
        }

        const [startCol, startRow] = worksheet.getCell($__evalParams?.startingCell as string).address.match(/[A-Z]+|\d+/g)!
        const colIndex = ColumnLetterToNumber(startCol) // Convert column letter to number

        // Clear existing data if any
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.value = null
            })
        })

        // Set headers
        const fields = Object.keys(data.Rows()[0])
        fields.forEach((field, colIdx) => {
            worksheet.getCell(parseInt(startRow, 10), colIndex + colIdx).value = field
        })

        // Set data
        data.Rows().forEach((row, rowIndex) => {
            fields.forEach((field: string, fieldIdx: number) => {
                const _rowIdx = parseInt(startRow, 10) + 1 + rowIndex
                const _colIdx: number = colIndex + fieldIdx

                let _valueToSet = row[field]

                if (_valueToSet === null) {
                    _valueToSet = $__evalParams!.default
                }

                if ($__evalParams!.parseDates && _valueToSet instanceof Date) {
                    worksheet.getCell(_rowIdx, _colIdx).numFmt = $__evalParams!.dateFormat as string
                }
                worksheet.getCell(_rowIdx, _colIdx).value = _valueToSet as import('exceljs').ValueType
            })
        })

        // Create a new buffer and stream
        const buffer = await workbook.xlsx.writeBuffer()
        const streamOut = new Readable()
        
        // Set the encoding to binary to prevent corruption
        streamOut.setEncoding('binary')
        streamOut.push(buffer)
        streamOut.push(null)

        // Upload the buffer to content
        this.Content.UploadFile(this.EntityName, streamOut)
        
        return streamOut
    }
}
