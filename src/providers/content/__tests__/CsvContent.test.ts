import { TSourceParams } from '../../../types/TSourceParams'
import { CsvContent } from '../CsvContent'
import { DataTable } from '../../../types/DataTable'

describe('CsvContent', () => {
    const sourceParams: TSourceParams = <TSourceParams>{
        provider: "files",
        options: {
            jsonArrayPath: 'data'
        }
    }
    let csvContent = new CsvContent(sourceParams)

    beforeEach(() => {
        csvContent = new CsvContent(sourceParams)
    })

    describe('Init', () => {
        test('should initialize the CsvContent instance with provided name and content', async () => {
            const name = 'test.csv'
            const content = 'id,name\n1,John\n2,Jane'

            await csvContent.Init(name, content)

            expect(csvContent.EntityName).toBe(name)
            expect(csvContent.Content).toBe(content)
        })

        test('should set default values for Config when Options is not provided', async () => {
            const name = 'test.csv'
            const content = 'id,name\n1,John\n2,Jane'

            await csvContent.Init(name, content)

            expect(csvContent.Config.delimiter).toBe(',')
            expect(csvContent.Config.newline).toBe('\n')
            expect(csvContent.Config.header).toBe(true)
            expect(csvContent.Config.quoteChar).toBe('"')
            expect(csvContent.Config.skipEmptyLines).toBe('greedy')
        })

        test('should override default values for Config when Options is provided', async () => {
            const name = 'test.csv'
            const content = 'idname\n1John\n2Jane'
            const options = {
                csvDelimiter: '',
                csvNewline: '\r\n',
                csvHeader: false,
                csvQuoteChar: "'",
                csvSkipEmptyLines: 'greedy'
            }

            csvContent.Options = options
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
            const content = 'id,name\n1,John\n2,Jane'

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
            const content = ''

            await csvContent.Init(name, content)
            const dataTable = await csvContent.Get()

            expect(dataTable.Name).toBe(name)
            expect(dataTable.Rows).toEqual([])
        })

        test('should return an empty DataTable object when content is invalid', async () => {
            const name = 'test.csv'
            const content = 'id,name\n1,John\n2'

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
            const content = 'id,name\n1,John\n2,Jane'
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

            expect(csvContent.Content).toBe(updatedContent)
            expect(updatedContent).toBe('id,name\n3,Alice\n4,Bob')
        })
    })
})