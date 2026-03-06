import { Readable } from "node:stream"
import { DataTable } from "../../../types/DataTable"
import type { U__source_options_content_csv } from "../providers/CsvContent"
import { CsvContent, EscapeNewlines, UnescapeNewlines } from "../providers/CsvContent"

describe("CsvContent", () => {
	const contentConfig: U__source_options_content_csv = <U__source_options_content_csv>{
		"csv-delimiter": ",",
		"csv-newline": "\n",
		"csv-header": true,
		"csv-quote": "",
		"csv-skip-empty-lines": "greedy",
	}

	const csvContent = new CsvContent()

	beforeEach(() => {
		csvContent.SetConfig(contentConfig)
	})

	describe("EscapeNewlines/UnescapeNewlines", () => {
		// Get the replacement characters by escaping known values
		const ENC_BS = EscapeNewlines("\\").replace("\\\\", "")
		const ENC_CR = EscapeNewlines("\r").replace("\r", "")
		const ENC_LF = EscapeNewlines("\n").replace("\n", "")

		describe("EscapeNewlines", () => {
			it("should escape backslashes correctly", () => {
				expect(EscapeNewlines(String.raw`\test`)).toBe(`${ENC_BS}test`)
				expect(EscapeNewlines(String.raw`path\to\file`)).toBe(`path${ENC_BS}to${ENC_BS}file`)
			})

			it("should escape carriage returns correctly", () => {
				expect(EscapeNewlines("line1\rline2")).toBe(`line1${ENC_CR}line2`)
				expect(EscapeNewlines("test\r")).toBe(`test${ENC_CR}`)
			})

			it("should escape newlines correctly", () => {
				expect(EscapeNewlines("line1\nline2")).toBe(`line1${ENC_LF}line2`)
				expect(EscapeNewlines("test\n")).toBe(`test${ENC_LF}`)
			})

			it("should escape mixed newline sequences correctly", () => {
				expect(EscapeNewlines("line1\r\nline2\nline3")).toBe(`line1${ENC_CR}${ENC_LF}line2${ENC_LF}line3`)
				expect(EscapeNewlines("\r\n")).toBe(ENC_CR + ENC_LF)
			})

			it("should handle complex mixed content", () => {
				const input = `Multi\\line\ntext with\r\ncarriage\rreturns and\\backslashes`
				const expected = `Multi${ENC_BS}line${ENC_LF}text with${ENC_CR}${ENC_LF}carriage${ENC_CR}returns and${ENC_BS}backslashes`
				expect(EscapeNewlines(input)).toBe(expected)
			})

			it("should handle empty strings", () => {
				expect(EscapeNewlines("")).toBe("")
			})

			it("should handle strings without special characters", () => {
				expect(EscapeNewlines("normal text")).toBe("normal text")
				expect(EscapeNewlines("123")).toBe("123")
			})
		})

		describe("UnescapeNewlines", () => {
			it("should unescape backslashes correctly", () => {
				expect(UnescapeNewlines(`${ENC_BS}test`)).toBe(String.raw`\test`)
				expect(UnescapeNewlines(`path${ENC_BS}to${ENC_BS}file`)).toBe(String.raw`path\to\file`)
				expect(UnescapeNewlines(`${ENC_BS}${ENC_BS}server${ENC_BS}folder${ENC_BS}`)).toBe("\\\\server\\folder\\")
			})

			it("should unescape carriage returns correctly", () => {
				expect(UnescapeNewlines(`line1${ENC_CR}line2`)).toBe("line1\rline2")
				expect(UnescapeNewlines(`test${ENC_CR}`)).toBe("test\r")
			})

			it("should unescape newlines correctly", () => {
				expect(UnescapeNewlines(`line1${ENC_LF}line2`)).toBe("line1\nline2")
				expect(UnescapeNewlines(`test${ENC_LF}`)).toBe("test\n")
			})

			it("should unescape mixed newline sequences correctly", () => {
				expect(UnescapeNewlines(`line1${ENC_CR}${ENC_LF}line2${ENC_LF}line3`)).toBe("line1\r\nline2\nline3")
				expect(UnescapeNewlines(ENC_CR + ENC_LF)).toBe("\r\n")
			})

			it("should handle complex mixed content", () => {
				const input = `Multi${ENC_BS}line${ENC_LF}text with${ENC_CR}${ENC_LF}carriage${ENC_CR}returns and${ENC_BS}backslashes`
				const expected = `Multi\\line\ntext with\r\ncarriage\rreturns and\\backslashes`
				expect(UnescapeNewlines(input)).toBe(expected)
			})

			it("should handle empty strings", () => {
				expect(UnescapeNewlines("")).toBe("")
			})

			it("should handle strings without escape sequences", () => {
				expect(UnescapeNewlines("normal text")).toBe("normal text")
				expect(UnescapeNewlines("123")).toBe("123")
			})
		})

		describe("Round-trip consistency", () => {
			it("should maintain data integrity through escape/unescape cycle", () => {
				const testCases = [
					"Simple text",
					"Text with\nnewlines",
					"Text with\r\rcarriage returns",
					"Text with\r\nmixed line endings",
					String.raw`Path\with\backslashes`,
					String.raw`Path\with\backslashes`,
					String.raw`Complex\mixed\r\ncontent\nwith\special\chars`,
					"",
					"Single line",
					"Multiple\nlines\r\nwith\rdifferent\nendings",
					`Complex\\and mixed\\r\\ncontent\\nhere`, // NOSONAR
					String.raw`Complex\and mixed\r\ncontent\nhere`,
				]

				testCases.forEach((testCase) => {
					const escaped = EscapeNewlines(testCase)
					const unescaped = UnescapeNewlines(escaped)
					expect(unescaped).toBe(testCase)
				})
			})

			it("should handle unicode characters correctly", () => {
				const testCases = [
					"Café\nRestaurant",
					"🦄\r🌟",
					"测试\r\n中文",
					"Emoji 🎉\nand text \\with\\ backslashes",
					"Спецсимволы\rи\tкириллица",
				]

				testCases.forEach((testCase) => {
					const escaped = EscapeNewlines(testCase)
					const unescaped = UnescapeNewlines(escaped)
					expect(unescaped).toBe(testCase)
				})
			})
		})
	})

	describe("Round-trip CSV operations", () => {
		it("should preserve newline content through CSV Get/Set cycle", async () => {
			const name = "test-newlines.csv"
			const content = Readable.from("")

			csvContent.InitContent(name, content)

			// Create test data with various newline types
			const originalData = new DataTable(name, [
				{
					id: "1",
					description: "Line 1\nLine 2",
					notes: "Multi\r\nline\ntext",
				},
				{
					id: "2",
					description: "Simple text",
					notes: "Single\rline",
				},
				{
					id: "3",
					description: String.raw`Path\to\file`,
					notes: String.raw`Complex\and mixed\r\ncontent\nhere`,
				},
			])

			// Set data
			const csvStream = await csvContent.Set(originalData, {})

			// Read back the data
			csvContent.InitContent(name, csvStream)
			const retrievedData = await csvContent.Get({}, {})

			const retrievedRows = await retrievedData.Rows()
			const originalRows = await originalData.Rows()

			// Data should be preserved through the cycle
			expect(retrievedRows).toEqual(originalRows)
		})

		it("should handle empty and null values correctly", async () => {
			const name = "test-empty.csv"
			const content = Readable.from("")

			csvContent.InitContent(name, content)

			const originalData = new DataTable(name, [
				{
					id: "1",
					description: String.raw`Field with, comma\nand line break`,
				},
				{
					id: "2",
					description: "Text with\nnewlines",
					notes: "Good notes",
				},
			])

			await csvContent.Set(originalData, {})

			const retrievedData = await csvContent.Get({}, {})

			const retrievedRows = await retrievedData.Rows()
			const originalRows = await originalData.Rows()

			// patch - new implementation correctly includes all columns
			originalRows[0]! = { ...originalRows[0]!, notes: "" }

			expect(retrievedRows).toEqual(originalRows)
		})

		it("should handle special characters and quotes", async () => {
			const name = "test-special.csv"
			const content = Readable.from("")

			csvContent.InitContent(name, content)

			const originalData = new DataTable(name, [
				{
					id: "1",
					notes: String.raw`Text with "notes" and\nnewlines`,
					text: String.raw`Text with "text" and\nnewlines`,
				},
				{
					id: "2",
					text: "Back\\slash and\r\ncarriage return text",
					description: "Normal description",
				},
			])

			const csvStream = await csvContent.Set(originalData, {})

			csvContent.InitContent(name, csvStream)
			const retrievedData = await csvContent.Get({}, {})

			const retrievedRows = await retrievedData.Rows()
			const originalRows = await originalData.Rows()

			// patch - the new implementation correctly includes all columns
			originalRows[0] = { ...originalRows[0]!, description: "" }
			originalRows[1] = { ...originalRows[1]!, notes: "" }

			expect(retrievedRows).toEqual(originalRows)
		})
	})

	describe("Init", () => {
		test("should initialize the CsvContent instance with provided name and content", async () => {
			const name = "test.csv"
			const content = Readable.from("id,name\n1,John\n2,Jane")

			csvContent.InitContent(name, content)

			expect(csvContent.EntityName).toBe(name)
			expect(csvContent.Content.ReadFile(name)).toBe(content)
		})

		test("should set default values for Config when Options is not provided", async () => {
			const name = "test.csv"
			const content = Readable.from("id,name\n1,John\n2,Jane")

			csvContent.InitContent(name, content)

			expect(csvContent.Params?.delimiter).toBe(",")
			expect(csvContent.Params?.headers).toBe(true)
			expect(csvContent.Params?.record_delimiter).toBe("\n")
			expect(csvContent.Params?.quote).toBe('"')
			expect(csvContent.Params?.skip_empty_lines).toBe(true)
		})

		test("should override default values for Config when Options is provided", async () => {
			const name = "test.csv"
			const content = Readable.from("idname\n1John\n2Jane")
			const options: U__source_options_content_csv = {
				"csv-delimiter": "",
				"csv-newline": "\r\n",
				"csv-header": false,
				"csv-quote": undefined,
				"csv-skip-empty-lines": "greedy",
			}

			csvContent.SetConfig(options)
			csvContent.InitContent(name, content)

			expect(csvContent.Params?.delimiter).toBe("")
			expect(csvContent.Params?.headers).toBe(false)
			expect(csvContent.Params?.record_delimiter).toBe("\r\n")
			expect(csvContent.Params?.quote).toBe('"')
			expect(csvContent.Params?.skip_empty_lines).toBe(true)
		})
	})

	describe("Get", () => {
		test("should parse the CsvContent content and return a DataTable object", async () => {
			const name = "test.csv"
			const content = Readable.from("id,name\n1,John\n2,Jane")

			csvContent.InitContent(name, content)
			const dataTable = await csvContent.Get({}, {})

			expect(dataTable.Name).toBe(name)
			expect(await dataTable.Rows()).toEqual([
				{
					id: "1",
					name: "John",
				},
				{
					id: "2",
					name: "Jane",
				},
			])
		})

		test("should return an empty DataTable object when content is empty", async () => {
			const name = "test.csv"
			const content = Readable.from("")

			csvContent.InitContent(name, content)
			const dataTable = await csvContent.Get({}, {})

			expect(dataTable.Name).toBe(name)
			expect(await dataTable.Rows()).toEqual([])
		})

		test("should return an empty DataTable object when content is invalid", async () => {
			const name = "test.csv"
			const content = Readable.from("id,name\n1,John\n2")

			csvContent.InitContent(name, content)
			const dataTable = await csvContent.Get({}, {})

			expect(dataTable.Name).toBe(name)
			expect(await dataTable.Rows()).toEqual([
				{
					id: "1",
					name: "John",
				},
				{
					id: "2",
				},
			])
		})
	})

	describe("Set", () => {
		test("should replace the content of CsvContent using the provided DataTable and return the updated content", async () => {
			const name = "test.csv"
			const content = Readable.from("id,name\n1,John\n2,Jane")
			const dataTable = new DataTable(name, [
				{
					id: "3",
					name: "Alice",
				},
				{
					id: "4",
					name: "Bob",
				},
			])

			csvContent.InitContent(name, content)
			const updatedContent = await csvContent.Set(dataTable, {})
			const expectedContent = Readable.from("id,name\n3,Alice\n4,Bob")

			expect(updatedContent.read().toString().trim()).toBe(expectedContent.read().toString().trim())
		})
	})
})
