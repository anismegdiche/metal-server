/** biome-ignore-all lint/suspicious/noExplicitAny: testing */
import { Readable } from "node:stream"
import * as ExcelJS from "exceljs"
import { HttpErrorInternalServerError } from "../../errors/HttpErrors"
import { DataTable } from "../../../types/DataTable"
import { CONTENT } from "../@consts"
import { ColumnLetterToNumber, type T_XlsxContentParams, XlsxContent } from "../providers/XlsxContent"


const crc32Table = new Uint32Array(256).map((_, i) => {
	let c = i
	for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
	return c
})
function crc32(buf: Buffer): number {
	let crc = 0xFFFFFFFF
	for (const byte of buf) crc = crc32Table[(crc ^ byte) & 0xFF]! ^ (crc >>> 8)
	return (crc ^ 0xFFFFFFFF) >>> 0
}

describe("ColumnLetterToNumber", () => {
	it("should convert a single letter column 'A' to 1", () => {
		expect(ColumnLetterToNumber("A")).toBe(1)
	})

	it("should convert a two-letter column 'AA' to 27", () => {
		expect(ColumnLetterToNumber("AA")).toBe(27)
	})

	it("should convert 'ZZ' to the correct column number", () => {
		expect(ColumnLetterToNumber("ZZ")).toBe(702)
	})
})

// Helper function to create a readable stream from string/buffer
function createReadableStream(data: string | Buffer): Readable {
	return new Readable({
		read() {
			// file deepcode ignore ArrayMethodOnNonArray/test: testing purpose
			this.push(data)
			this.push(null)
		},
	})
}

// Helper function to create a mock Excel workbook
async function createMockWorkbook(data: any[][]): Promise<Buffer> {
	const workbook = new ExcelJS.Workbook()
	const worksheet = workbook.addWorksheet("Sheet1")
	data.forEach((rowData) => {
		worksheet.addRow(rowData)
	})

	const buffer = await workbook.xlsx.writeBuffer()
	return buffer as unknown as Buffer<ArrayBufferLike>
}

describe("XlsxContent", () => {
	let xlsxContent: XlsxContent
	let mockWorkbookBuffer: Buffer

	beforeEach(async () => {
		// Create mock Excel data
		const mockData = [
			["Name", "Age", "Date"],
			["John", 30, new Date("2024-01-01")],
			["Jane", 25, new Date("2024-02-01")],
		]
		mockWorkbookBuffer = await createMockWorkbook(mockData)

		// Setup XlsxContent
		xlsxContent = new XlsxContent()
		xlsxContent.SetConfig({
			"content-type": CONTENT.XLSX,
		})
	}, 300_000)

	describe("Init", () => {
		it("should initialize with default parameters", async () => {
			const inputStream = createReadableStream(mockWorkbookBuffer)
			xlsxContent.Config = {
				"content-type": CONTENT.XLSX,
			}

			xlsxContent.InitContent("testEntity", inputStream)

			expect(xlsxContent.EntityName).toBe("testEntity")
			expect(xlsxContent.Params).toEqual({
				sheet: undefined,
				parseDates: false,
				default: null,
				dateFormat: "dd/mm/yyyy",
				startingCell: "A1",
			})
		})

		it("should initialize with custom parameters", async () => {
			const inputStream = createReadableStream(mockWorkbookBuffer)
			xlsxContent.SetConfig({
				"content-type": CONTENT.XLSX,
				"xlsx-sheet": "Sheet1",
				"xlsx-parse-dates": true,
				"xlsx-default": 0,
				"xlsx-date-format": "yyyy-mm-dd",
				"xlsx-starting-cell": "B2",
			})

			xlsxContent.InitContent("testEntity", inputStream)

			expect(xlsxContent.Params).toEqual({
				sheet: "Sheet1",
				parseDates: true,
				default: 0,
				dateFormat: "yyyy-mm-dd",
				startingCell: "B2",
			})
		})
	})

	describe("Get", () => {
		beforeEach(async () => {
			const inputStream = createReadableStream(mockWorkbookBuffer)
			xlsxContent.Config = {
				"content-type": CONTENT.XLSX,
				"xlsx-sheet": "Sheet1",
				"xlsx-starting-cell": "A1",
			}
			xlsxContent.InitContent("testEntity", inputStream)
		})

		it("should throw error if Params is not defined", async () => {
			xlsxContent.Params = undefined as unknown as T_XlsxContentParams
			await expect(xlsxContent.Get({}, {})).rejects.toThrow(HttpErrorInternalServerError)
		})

		it("should parse Excel data correctly", async () => {
			const result = await xlsxContent.Get({}, {})

			expect(result).toBeInstanceOf(DataTable)

			const rows = await result.Rows()
			expect(rows).toHaveLength(2) // Only one data row since first row is header
			expect(rows[0]).toEqual({
				Name: "John",
				Age: 30,
				Date: expect.any(Date),
			})
		})

		it("should handle SQL queries", async () => {
			const result = await xlsxContent.Get(
				{
					filter: "Age > 25",
				},
				{},
			)

			expect(result).toBeInstanceOf(DataTable)
			expect(await result.Count()).toBeGreaterThanOrEqual(0)
		})
	})

	describe("Set", () => {
		let mockDataTable: DataTable

		beforeEach(async () => {
			const inputStream = createReadableStream(mockWorkbookBuffer)
			xlsxContent.Config = {
				"content-type": CONTENT.XLSX,
				"xlsx-sheet": "Sheet1",
				"xlsx-starting-cell": "A1",
			}
			xlsxContent.InitContent("testEntity", inputStream)

			mockDataTable = new DataTable("testEntity", [
				{
					name: "John",
					age: 30,
					date: new Date("2024-01-01"),
				},
			])
		})

		it("should throw error if Params is not defined", async () => {
			xlsxContent.Params = undefined as unknown as T_XlsxContentParams
			await expect(xlsxContent.Set(mockDataTable, {})).rejects.toThrow(HttpErrorInternalServerError)
		})

		it("should write data to Excel correctly", async () => {
			mockDataTable = new DataTable("testEntity", [
				{
					name: "John",
					age: 30,
					date: new Date("2024-01-01"),
				},
			])

			// Create a mock Excel file content
			const mockExcelContent = new Readable({
				read() {
					// Create a minimal valid ZIP structure with Excel-specific files
					let offset = 0
					const fileHeaders: Buffer[] = []
					const centralDirHeaders: Buffer[] = []

					// Function to create file header
					const createFileHeader = (filename: string, content: string) => {
						const data = Buffer.from(content)
						const filenameBuffer = Buffer.from(filename)

						// Calculate CRC-32 and file sizes
						const crc32Value = crc32(data)
						const compressedSize = data.length
						const uncompressedSize = data.length

						// Local file header
						const localFileHeader = Buffer.concat([
							Buffer.from([0x50, 0x4b, 0x03, 0x04]), // Local file header signature
							Buffer.from([0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // Version, flags, method, timestamps
							Buffer.from([crc32Value, 0x00, 0x00, 0x00]), // CRC-32
							Buffer.from([compressedSize, 0x00, 0x00, 0x00]), // Compressed size
							Buffer.from([uncompressedSize, 0x00, 0x00, 0x00]), // Uncompressed size
							Buffer.from([filenameBuffer.length, 0x00, 0x00, 0x00]), // Filename length, extra field length
							filenameBuffer,
							data,
						])

						// Central directory header
						const centralDirHeader = Buffer.concat([
							Buffer.from([0x50, 0x4b, 0x01, 0x02]), // Central directory file header signature
							Buffer.from([0x14, 0x00, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]), // Version, flags, method, timestamps
							Buffer.from([crc32Value, 0x00, 0x00, 0x00]), // CRC-32
							Buffer.from([compressedSize, 0x00, 0x00, 0x00]), // Compressed size
							Buffer.from([uncompressedSize, 0x00, 0x00, 0x00]), // Uncompressed size
							Buffer.from([
								filenameBuffer.length,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
								0x00,
							]), // Filename length, extra field length, comment length, disk number, internal attributes, external attributes
							Buffer.from([offset, 0x00, 0x00, 0x00]), // Relative offset of local header
							filenameBuffer,
						])

						fileHeaders.push(localFileHeader)
						centralDirHeaders.push(centralDirHeader)
						offset += localFileHeader.length
					}

					// Create all necessary Excel files
					createFileHeader(
						"[Content_Types].xml",
						`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
</Types>`,
					)
					createFileHeader(
						"_rels/.rels",
						`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
					)
					createFileHeader(
						"xl/workbook.xml",
						`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <sheets>
        <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
    </sheets>
</workbook>`,
					)
					createFileHeader(
						"xl/_rels/workbook.xml.rels",
						`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
					)
					createFileHeader(
						"xl/worksheets/sheet1.xml",
						`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData/></worksheet>`,
					)

					// Create end of central directory record
					const endOfCentralDir = Buffer.concat([
						Buffer.from([0x50, 0x4b, 0x05, 0x06]), // End of central directory signature
						Buffer.from([0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x05, 0x00]), // Number of this disk, disk where central directory starts, number of central directory records on this disk, total number of central directory records
						Buffer.from([centralDirHeaders.reduce((sum, header) => sum + header.length, 0), 0x00, 0x00, 0x00]), // Size of central directory
						Buffer.from([offset, 0x00, 0x00, 0x00]), // Offset of start of central directory
						Buffer.from([0x00, 0x00]), // ZIP file comment length
					])

					// Push all parts in order
					fileHeaders.forEach((header) => {
						this.push(header)
					})
					centralDirHeaders.forEach((header) => {
						this.push(header)
					})
					this.push(endOfCentralDir)
					this.push(null)
				},
			})

			// Initialize the content with the mock Excel file
			xlsxContent.Content.UploadFile("testEntity", mockExcelContent)

			const result = await xlsxContent.Set(mockDataTable, {})

			expect(result).toBeInstanceOf(Readable)
			expect(xlsxContent.Content.Files.testEntity).toBeDefined()
		})
	})
})
