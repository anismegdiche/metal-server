import { CsvContent, TCsvContentConfig } from '../CsvContent'
import { DataTable } from '../../../types/DataTable'
import { Readable } from "node:stream"
import { TContentConfig } from "../../data/FilesDataProvider"

describe('CsvContent', () => {
    const contentConfig: TContentConfig = <TContentConfig>{
        csvDelimiter: ',',
        csvNewline: '\n',
        csvHeader: true,
        csvQuoteChar: '"',
        csvSkipEmptyLines: 'greedy'
    }
    
    let csvContent = new CsvContent(contentConfig)

    beforeEach(() => {
        csvContent = new CsvContent(contentConfig)
    })

    describe('Init', () => {
        test('should initialize the CsvContent instance with provided name and content', async () => {
            const name = 'test.csv'
            const content = Readable.from('id,name\n1,John\n2,Jane')

            await csvContent.Init(name, content)

            expect(csvContent.EntityName).toBe(name)
            expect(csvContent.Content.ReadFile(name)).toBe(content)
        })

        test('should set default values for Config when Options is not provided', async () => {
            const name = 'test.csv'
            const content = Readable.from('id,name\n1,John\n2,Jane')

            await csvContent.Init(name, content)

            expect(csvContent.Config.delimiter).toBe(',')
            expect(csvContent.Config.newline).toBe('\n')
            expect(csvContent.Config.header).toBe(true)
            expect(csvContent.Config.quoteChar).toBe('"')
            expect(csvContent.Config.skipEmptyLines).toBe('greedy')
        })

        test('should override default values for Config when Options is provided', async () => {
            const name = 'test.csv'
            const content = Readable.from('idname\n1John\n2Jane')
            const options = {
                csvDelimiter: '',
                csvNewline: '\r\n',
                csvHeader: false,
                csvQuoteChar: "'",
                csvSkipEmptyLines: 'greedy'
            }

            csvContent.Options = <TCsvContentConfig>options

            await csvContent.Init(name, content)

            expect(csvContent.Config.delimiter).toBe('')
            expect(csvContent.Config.newline).toBe('\r\n')
            expect(csvContent.Config.header).toBe(false)
            expect(csvContent.Config.quoteChar).toBe("'")
            expect(csvContent.Config.skipEmptyLines).toBe('greedy')
        })
    })

    describe('Get', () => {
        test('should parse the CsvContent content and return a DataTable object', async () => {
            const name = 'test.csv'
            const content = Readable.from('id,name\n1,John\n2,Jane')

            await csvContent.Init(name, content)
            const dataTable = await csvContent.Get()

            expect(dataTable.Name).toBe(name)
            expect(dataTable.Rows).toEqual([
                {
                    id: '1',
                    name: 'John'
                },
                {
                    id: '2',
                    name: 'Jane'
                }
            ])
        })

        test('should return an empty DataTable object when content is empty', async () => {
            const name = 'test.csv'
            const content = Readable.from('')

            await csvContent.Init(name, content)
            const dataTable = await csvContent.Get()

            expect(dataTable.Name).toBe(name)
            expect(dataTable.Rows).toEqual([])
        })

        test('should return an empty DataTable object when content is invalid', async () => {
            const name = 'test.csv'
            const content = Readable.from('id,name\n1,John\n2')

            await csvContent.Init(name, content)
            const dataTable = await csvContent.Get()

            expect(dataTable.Name).toBe(name)
            expect(dataTable.Rows).toEqual([
                {
                    id: "1",
                    name: "John"
                },
                {
                    id: "2"
                }
            ])
        })
    })

    describe('Set', () => {
        test('should set the content of CsvContent using the provided DataTable and return the updated content', async () => {
            const name = 'test.csv'
            const content = Readable.from('id,name\n1,John\n2,Jane')
            const dataTable = new DataTable(name, [
                {
                    id: '3',
                    name: 'Alice'
                },
                {
                    id: '4',
                    name: 'Bob'
                }
            ])

            await csvContent.Init(name, content)
            const updatedContent = await csvContent.Set(dataTable)
            const expectedContent = Readable.from('id,name\n3,Alice\n4,Bob')

            expect(updatedContent.read().toString()).toBe(expectedContent.read().toString())
        })
    })
})