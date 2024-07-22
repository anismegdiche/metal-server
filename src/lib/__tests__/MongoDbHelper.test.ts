

import { Convert } from '../Convert'
import { MongoDbHelper } from '../MongoDbHelper'

describe('MongoDbHelper', () => {

    describe('ConvertSqlSort', () => {
        // ConvertSqlSort correctly converts SQL sort to MongoDB sort
        it('should return correct MongoDB sort object when given valid SQL sort string', () => {
            const key = {}
            const value = "name asc"
            const result = MongoDbHelper.ConvertSqlSort(key, value)
            expect(result).toEqual({ name: 1 })
        })

        // ConvertSqlSort returns empty object for invalid sort string
        it('should return empty object when given invalid SQL sort string', () => {
            const key = {}
            const value = "name asc extra"
            const result = MongoDbHelper.ConvertSqlSort(key, value)
            expect(result).toEqual({})
        })

        // ConvertSqlSort handles single field sorting
        it('should handle single field sorting when valid field and sort direction are provided', () => {
            const key = {}
            const value = 'name asc'
            const expectedMongoSort = { name: 1 }

            const result = MongoDbHelper.ConvertSqlSort(key, value)

            expect(result).toEqual(expectedMongoSort)
        })

        // ConvertSqlSort handles ascending sort direction
        it('should handle ascending sort direction when valid input is provided', () => {
            const key = { name: 1 }
            const value = 'name asc'
            const result = MongoDbHelper.ConvertSqlSort(key, value)
            expect(result).toEqual({ name: 1 })
        })

        // ConvertSqlSort handles descending sort direction
        it('should handle descending sort direction when valid input is provided', () => {
            const key = { name: 1 }
            const value = 'name desc'
            const result = MongoDbHelper.ConvertSqlSort(key, value)
            expect(result).toEqual({ name: -1 })
        })

        // ConvertSqlSort handles empty sort string
        it('should return an empty object when the sort string is empty', () => {
            const key = { field: 'value' }
            const value = ''

            const result = MongoDbHelper.ConvertSqlSort(key, value)

            expect(result).toEqual({})
        })

        // ConvertSqlSort handles sort string with more than two words
        it('should return an empty object when the sort string has more than two words', () => {
            const key = { field: 'value' }
            const value = 'field asc extra'

            const result = MongoDbHelper.ConvertSqlSort(key, value)

            expect(result).toEqual({})
        })
    })

    describe('ConvertSqlQuery', () => {
        // ConvertSqlQuery correctly converts SQL query to MongoDB query
        it('should convert SQL query to MongoDB query when valid SQL query is provided', () => {
            const sqlQuery = 'status = "active"'
            const expectedMongoQuery = { status: "active" }

            const result = MongoDbHelper.ConvertSqlQuery(sqlQuery)

            expect(result).toEqual(expectedMongoQuery)
        })
    })


})
