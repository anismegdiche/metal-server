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
            const content = Buffer.from('{"key": "value"}', 'utf-8')

            const jsonContentEmptyOptions = new JsonContent(<TSourceParams>{
                ...sourceParams,
                options: {}
            })

            await jsonContentEmptyOptions.Init(name, content)
            expect(jsonContentEmptyOptions.Config).toEqual({ arrayPath: undefined })
        })

        it('should initialize the content and config correctly', async () => {
            const name = 'test'
            const content = Buffer.from('{"key": "value"}', 'utf-8')

            await jsonContent.Init(name, content)

            expect(jsonContent.EntityName).toBe(name)
            expect(jsonContent.Content).toBe(content)
            expect(jsonContent.JsonObject).toEqual({ "key": "value" })
        })

        it('should handle empty content and set default values', async () => {
            const name = 'test'
            const content = Buffer.from('', 'utf-8')

            await jsonContent.Init(name, content)

            expect(jsonContent.EntityName).toBe(name)
            expect(jsonContent.Content).toBe(content)
            expect(jsonContent.JsonObject).toEqual({})
        })
    })

    describe('Get', () => {
        beforeEach(async () => {
            const name = 'test'
            const content = Buffer.from('{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}', 'utf-8')

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
            jsonContent.Config.jsonArrayPath = 'nonexistent.path'

            const dataTable = await jsonContent.Get()

            expect(dataTable).toBeInstanceOf(DataTable)
            expect(dataTable.Name).toBe(jsonContent.EntityName)
            expect(dataTable.Rows).toEqual([])
        })
    })

    describe('Set', () => {
        beforeEach(async () => {
            const name = 'test'
            const content = Buffer.from('{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}', 'utf-8')

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

            const buffer = await jsonContent.Set(newDataTable)

            expect(jsonContent.JsonObject).toEqual({
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
            expect(jsonContent.Content).toBe(buffer)
        })
    })
})