import { DataTable } from "../../../types/DataTable"
import { TJson } from "../../../types/TJson"
import { MongoDbDataOptions } from "../MongoDbData"
import * as MongoDb from 'mongodb'

describe('MongoDbDataOptions', () => {

    // GetFilter converts filter-expression to MongoDB query format
    it('should convert SQL-like filter expression to MongoDB query format', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            "filter-expression": "name LIKE 'test%'"
        }
        const result = options.GetFilter({}, schemaRequest)
        expect(result.Filter).toEqual({
            $match: {
                name: {
                    $regex: "test\\.\\*",
                    $options: "i"
                }
            }
        })
    })

    // GetFilter handles _id conversion to MongoDB ObjectId
    it('should convert string _id to MongoDB ObjectId', () => {
        const options = new MongoDbDataOptions()
        const validId = '64c13ab08edf48a008793cac'
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            filter: { _id: validId }
        }
        const result = options.GetFilter({}, schemaRequest)
        expect(result?.Filter).toBeDefined()
        const match = (result?.Filter as TJson).$match as TJson
        expect(match._id).toBeInstanceOf(MongoDb.ObjectId)
    })

    // GetFields splits comma-separated field list into MongoDB projection
    it('should split comma-separated fields into MongoDB projection', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            fields: 'name,age,email'
        }
        const result = options.GetFields({}, schemaRequest)
        expect(result.Fields).toEqual({
            $project: {
                name: 1,
                age: 1,
                email: 1
            }
        })
    })

    // GetSort transforms sort string into MongoDB sort object
    it('should transform sort string into MongoDB sort object', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            sort: 'name ASC,age DESC'
        }
        const result = options.GetSort({}, schemaRequest)
        expect(result.Sort).toEqual({
            $sort: {
                name: 1,
                age: -1
            }
        })
    })

    // GetFields creates $project operator with field names as keys and 1 as values
    it('should create $project operator with field names and values of 1', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            fields: 'field1, field2'
        }
        const result = options.GetFields({}, schemaRequest)
        expect(result.Fields).toEqual({
            $project: {
                field1: 1,
                field2: 1
            }
        })
    })

    // GetSort creates $sort operator with field names and directions
    it('should create $sort operator with correct sort directions', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            sort: 'field1 ASC, field2 DESC'
        }
        const result = options.GetSort({}, schemaRequest)
        expect(result.Sort).toEqual({
            $sort: {
                field1: 1,
                field2: -1
            }
        })
    })

    // GetFilter handles empty or undefined filter-expression and filter
    it('should return unmodified options when filter is empty', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test'
        }
        const result = options.GetFilter({}, schemaRequest)
        expect(result).toEqual({})
    })

    // GetFields handles empty or malformed fields string
    it('should handle empty fields string gracefully', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            fields: '   '
        }
        const result = options.GetFields({}, schemaRequest)
        expect(result.Fields).toEqual({
            $project: {}
        })
    })

    // GetSort handles empty or malformed sort string
    it('should handle empty sort string gracefully', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            sort: '   '
        }
        const result = options.GetSort({}, schemaRequest)
        expect(result.Sort).toEqual({
            $sort: {}
        })
    })

    // GetFilter handles invalid _id format
    it('should throw error for invalid ObjectId format', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            filter: { _id: 'invalid-id' }
        }
        expect(() => options.GetFilter({}, schemaRequest)).toThrow()
    })

    // GetFields handles single field without comma separator
    it('should handle single field name correctly', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            fields: 'username'
        }
        const result = options.GetFields({}, schemaRequest)
        expect(result.Fields).toEqual({
            $project: { username: 1 }
        })
    })

    // GetSort handles single sort field without comma
    it('should handle single sort field correctly', () => {
        const options = new MongoDbDataOptions()
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            sort: 'username DESC'
        }
        const result = options.GetSort({}, schemaRequest)
        expect(result.Sort).toEqual({
            $sort: { username: -1 }
        })
    })

    // GetSort handles single sort field without comma
    it('should handle single sort field correctly', () => {
        const options = new MongoDbDataOptions()
        const dt = new DataTable('test-table', [
            {
                name: 'updated'
            }
        ])
        const schemaRequest = {
            schema: 'test',
            entity: 'test',
            "filter-expression": 'id > 5',
            data: dt.Rows
        }
        const result = options.Parse(schemaRequest)
        expect(result.Filter).toEqual({
            $match: {
                id: {
                    $gt: 5
                }
            }
        })
        expect(result.Data).toEqual(dt.Rename(schemaRequest.entity))
    })
})
