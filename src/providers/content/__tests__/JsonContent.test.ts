import { Readable } from "node:stream"
import { DataTable } from '../../../types/DataTable'
import { JsonContent } from '../JsonContent'
import { TContentConfig } from "../../data/FilesDataProvider"

describe('JsonContent', () => {
    const contentConfig: TContentConfig = {
        jsonArrayPath: 'data'
    }

    let jsonContent = new JsonContent(contentConfig)

    beforeEach(() => {
        jsonContent = new JsonContent(contentConfig)
    })

    describe('Init', () => {
        it('should initialize the content and config correctly with empty options', async () => {
            const name = 'test'
            const content = Readable.from('{"key": "value"}')

            const jsonContentEmptyOptions = new JsonContent({})

            await jsonContentEmptyOptions.Init(name, content)
            expect(jsonContentEmptyOptions.Config).toEqual({ arrayPath: undefined })
        })

        it('should initialize the content and config correctly', async () => {
            const name = 'test'
            const content = Readable.from('{"key": "value"}')

            await jsonContent.Init(name, content)

            expect(jsonContent.EntityName).toBe(name)
            expect(jsonContent.Content.ReadFile(name)).toBe(content)
        })
    })

    describe('Get', () => {
        beforeEach(async () => {
            const name = 'test'
            const content = Readable.from('{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}')

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
        const name = 'test'
        beforeEach(async () => {
            const content = Readable.from('{"data": [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]}')
            await jsonContent.Init(name, content)
        })

        it('should update the content and return the updated raw content', async () => {
            const newData = new DataTable(name, [
                {
                    id: 3,
                    name: 'Alice'
                },
                {
                    id: 4,
                    name: 'Bob'
                }
            ])

            await jsonContent.Set(newData)

            expect(await jsonContent.Get()).toEqual(newData)
        })
    })
})