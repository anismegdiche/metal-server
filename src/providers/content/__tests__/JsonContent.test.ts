import { DataTable } from '../../../types/DataTable'
import { TSourceParams } from '../../../types/TSourceParams'
import { JsonContent } from '../JsonContent'

describe('JsonContent', () => {
    const sourceParams: TSourceParams = <TSourceParams>{
        provider: "files",
        options: {
            jsonArrayPath: 'data'
        }
    }

    let jsonContent = new JsonContent(sourceParams)

    beforeEach(() => {
        jsonContent = new JsonContent(sourceParams)
    })

    describe('Init', () => {
        it('should initialize the content and config correctly with empty options', async () => {
            const name = 'test'
            const content = '{"key": "value"}'

            const jsonContentEmptyOptions = new JsonContent(<TSourceParams>{
                ...sourceParams,
                options: {}
            })

            await jsonContentEmptyOptions.Init(name, content)
            expect(jsonContentEmptyOptions.Config).toEqual({ arrayPath: undefined })
        })

        it('should initialize the content and config correctly', async () => {
            const name = 'test'
            const content = '{"key": "value"}'

            await jsonContent.Init(name, content)

            expect(jsonContent.EntityName).toBe(name)
            expect(jsonContent.RawContent).toBe(content)
            expect(jsonContent.Content).toEqual({ "key": "value" })
        })

        it('should handle empty content and set default values', async () => {
            const name = 'test'
            const content = ''

            await jsonContent.Init(name, content)

            expect(jsonContent.EntityName).toBe(name)
            expect(jsonContent.RawContent).toBe(content)
            expect(jsonContent.Content).toEqual({})
        })
    })

    describe('Get', () => {
        beforeEach(async () => {
            const name = 'test'
            const content = '{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}'

            await jsonContent.Init(name, content)
        })

        it('should return the data as a DataTable', async () => {
            const dataTable = await jsonContent.Get()

            expect(dataTable).toBeInstanceOf(DataTable)
            expect(dataTable.Name).toBe(jsonContent.EntityName)
            expect(dataTable.Rows).toEqual([
                {
                    id: 1,
                    name: 'John'
                },
                {
                    id: 2,
                    name: 'Jane'
                }
            ])
        })

        it('should return an empty DataTable if arrayPath is not found', async () => {
            jsonContent.Config.arrayPath = 'nonexistent.path'

            const dataTable = await jsonContent.Get()

            expect(dataTable).toBeInstanceOf(DataTable)
            expect(dataTable.Name).toBe(jsonContent.EntityName)
            expect(dataTable.Rows).toEqual([])
        })
    })

    describe('Set', () => {
        beforeEach(async () => {
            const name = 'test'
            const content = '{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}'

            await jsonContent.Init(name, content)
        })

        it('should update the content and return the updated raw content', async () => {
            const newDataTable = new DataTable('newData', [
                {
                    id: 3,
                    name: 'Alice'
                },
                {
                    id: 4,
                    name: 'Bob'
                }
            ])

            const rawContent = await jsonContent.Set(newDataTable)

            expect(jsonContent.Content).toEqual({
                "data": [
                    {
                        "id": 3,
                        "name": "Alice"
                    },
                    {
                        "id": 4,
                        "name": "Bob"
                    }
                ]
            })
            expect(jsonContent.RawContent).toBe(rawContent)
            expect(rawContent).toBe(JSON.stringify(jsonContent.Content))
        })
    })
})