//
//
//
import ExcelJS, { type Worksheet } from 'exceljs'
import { compact, merge } from 'lodash-es'
import { Readable } from 'node:stream'
//
import z from 'zod'
import type { TRowsCopyParams } from "../../../types/DataTable"
import { DataTable } from "../../../types/DataTable"
import type { TJson } from '../../../types/TJson'
import { Assert } from '../../../utils/Assert'
import { Logger } from '../../../utils/Logger'
import { PlaceHolder } from "../../../utils/PlaceHolder"
import { VirtualFileSystem } from '../../../utils/VirtualFileSystem'
import { HttpErrorInternalServerError } from '../../errors/HttpErrors'
import { Sandbox } from "../../sandbox/Sandbox"
import type { TContext } from "../../sandbox/types/TContext"
import { absContentProvider } from "../base/absContentProvider"


//
export const z_U__source_options_content_xls = z.object({
    "xls-sheet": z.string().describe("Specify which sheet to use, default first sheet").optional(),
    "xls-starting-cell": z.string().describe("Specify the starting cell (e.g., 'B2'), default 'A1'").optional(),
    "xls-default": z.union([
        z.number(),
        z.string(),
        z.null()
    ]).describe("Default value for empty cells").optional(),
    "xls-parse-dates": z.boolean().describe("Parse dates from cells, default false").optional(),
    "xls-date-format": z.string().describe("Specify the date format for parsing dates").optional(),
});


//
export const z_T_XlsContentParams = z.object({
    sheet: z.string().optional(),
    startingCell: z.string().optional(),
    default: z.union([
        z.number(),
        z.string(),
        z.null()
    ]).optional(),
    parseDates: z.boolean().optional(),
    dateFormat: z.string().optional(),
});


//
export type U__source_options_content_xls = z.infer<typeof z_U__source_options_content_xls>
export type T_XlsContentParams = z.infer<typeof z_T_XlsContentParams>


// Convert column letter (e.g., 'A', 'B', 'AA') to a column number
export function ColumnLetterToNumber(letter: string): number {
    let column = 0
    const { length } = letter

    for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1) // NOSONAR
    }

    return column
}


//
export class XlsContent extends absContentProvider {

    Params: T_XlsContentParams | undefined

    DEFAULT: U__source_options_content_xls = {
        "xls-parse-dates": false,
        "xls-default": null,
        "xls-date-format": "dd/mm/yyyy",
        "xls-starting-cell": "A1"
    }

    @Logger.LogFunction()
    InitContent(entity: string, content: Readable): void {
        this.EntityName = entity
        if (this.Config && z_U__source_options_content_xls.safeParse(this.Config).success) {
            this.Config = merge(this.DEFAULT, this.Config) as U__source_options_content_xls
            this.Params = {
                sheet: this.Config["xls-sheet"],
                parseDates: this.Config["xls-parse-dates"],
                default: this.Config["xls-default"],
                dateFormat: this.Config["xls-date-format"],
                startingCell: this.Config["xls-starting-cell"]
            }
        }
        this.Content.UploadFile(entity, content)
    }

    @Logger.LogFunction(['$context'])
    async Get(rowsParams: TRowsCopyParams, $context?: Partial<TContext>): Promise<DataTable> {
        Assert.Var<T_XlsContentParams>(this.Params,
            z_T_XlsContentParams.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const workbook = new ExcelJS.Workbook()
        Logger.Debug('XlsContent.Get: reading stream')
        await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))

        const $__evalParams = PlaceHolder.EvaluateJsCode<T_XlsContentParams>(
            this.Params,
            new Sandbox($context)
        )

        Logger.Debug('XlsContent.Get: Converting')

        Assert.Var<Worksheet>(workbook.worksheets[0], 'Sheet is not defined')

        const sheetName = $__evalParams!.sheet ?? workbook.worksheets[0].name
        const worksheet = workbook.getWorksheet(sheetName)

        if (worksheet == undefined)
            throw new HttpErrorInternalServerError(`Worksheet "${sheetName}" not found in workbook.`)

        const [startCol, startRow] = worksheet
            .getCell($__evalParams!.startingCell!)
            .address
            .match(/[A-Z]+|\d+/g)!

        Assert.Var<string>(startCol, 'startCol is not defined')
        Assert.Var<string>(startRow, 'startRow is not defined')

        const colIndex = ColumnLetterToNumber(startCol) // Convert column letter to number

        const fields = compact(worksheet.getRow(Number.parseInt(startRow, 10)).values as string[])

        if (fields == undefined || fields.length == 0)
            throw new HttpErrorInternalServerError(`Data in "${sheetName}" not found.`)

        const rows: TJson[] = []
        worksheet.eachRow({ includeEmpty: false }, (sheetRow, sheetRowNumber) => {
            if (sheetRowNumber > Number.parseInt(startRow, 10)) {
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
        using dataTable = new DataTable(this.EntityName, rows)
        return dataTable.Copy(this.EntityName, rowsParams)
    }

    @Logger.LogFunction(true)
    async Set(data: DataTable, $context?: Partial<TContext>): Promise<Readable> {
        Assert.Var<T_XlsContentParams>(this.Params,
            z_T_XlsContentParams.safeParse(this.Params).success,
            'Params is not defined')

        Assert.Var<VirtualFileSystem>(this.Content,
            VirtualFileSystem.Is(this.Content),
            'Content is not defined')

        const workbook = new ExcelJS.Workbook()

        // Try to read the existing file, but create a new workbook if it fails
        await workbook.xlsx.read(this.Content.ReadFile(this.EntityName))
            .catch(() => {
                Logger.Warn('XlsContent.Set: Could not read existing file, creating new workbook')
            })

        const $__evalParams = PlaceHolder.EvaluateJsCode<T_XlsContentParams>(
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

        Assert.Var<string>(startCol, 'startCol is not defined')
        Assert.Var<string>(startRow, 'startRow is not defined')
        Assert.Var<number>(colIndex, 'colIndex is not defined')

        // Clear existing data if any
        worksheet.eachRow({ includeEmpty: true }, (row) => {
            row.eachCell({ includeEmpty: true }, (cell) => {
                cell.value = null
            })
        })

        // Set headers
        const fields: string[] = Object.keys((await data.Row(0)))
        fields.forEach((field, colIdx) => {
            worksheet.getCell(Number.parseInt(startRow, 10), colIndex + colIdx).value = field
        })

            // Set data
            ; (await data.Rows()).forEach((row, rowIndex) => {
                fields.forEach((field: string, fieldIdx: number) => {
                    const _rowIdx = Number.parseInt(startRow, 10) + 1 + rowIndex
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

        // Push binary buffer without encoding to preserve Excel file integrity
        streamOut.push(buffer)
        streamOut.push(null)

        // Upload the buffer to content
        this.Content.UploadFile(this.EntityName, streamOut)

        return streamOut
    }
}
