

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

    // describe('ConvertSql_v2', () => {
    //     it('SELECT FROM WHERE ORDER BY', () => {
    //         const sqlQuery = `SELECT name, age FROM Users WHERE age > 30 ORDER BY name ASC`
    //         const expectedMongoQuery = {
    //             filter: {
    //               age: {
    //                 $gt: 30
    //               }
    //             },
    //             options: {
    //               projection: {
    //                 name: 1,
    //                 age: 1
    //               },
    //               sort: {
    //                 name: 1
    //               }
    //             }
    //           }
    //         const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //         expect(result).toEqual(expectedMongoQuery)
    //     })

    //     it(`SELECT FROM WHERE OR`, () => {
    //         const sqlQuery = `SELECT name, age FROM Users WHERE age > 30 OR name = 'Jane Doe'`
    //         const expectedMongoQuery = {}
    //         const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //         expect(result).toEqual(expectedMongoQuery)
    //     })

    //     // it('SELECT FROM INNER JOIN WHERE ORDER BY', () => {
    //     //     const sqlQuery = `
    //     //         SELECT Users.name, Orders.total 
    //     //         FROM Users 
    //     //         INNER JOIN Orders ON Users.userId = Orders.userId 
    //     //         WHERE Orders.total > 100 
    //     //         ORDER BY Users.name ASC
    //     //         `
    //     //     const expectedMongoQuery = {}
    //     //     const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //     //     expect(result).toEqual(expectedMongoQuery)
    //     // })

    //     it(`INSERT INTO () VALUES ()`, () => {
    //         const sqlQuery = `INSERT INTO Users (name, age) VALUES ('John Doe', 29)`
    //         const expectedMongoQuery = {
    //             name: "John Doe",
    //             age: 29
    //         }
    //         const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //         expect(result).toEqual(expectedMongoQuery)
    //     })

    //     it(`UPDATE SET WHERE`, () => {
    //         const sqlQuery = `UPDATE Users SET name = 'John Doe' WHERE age > 30`
    //         const expectedMongoQuery = {}
    //         const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //         expect(result).toEqual(expectedMongoQuery)
    //     })

    //     it(`DELETE FROM WHERE`, () => {
    //         const sqlQuery = `DELETE FROM Users WHERE name = 'John Doe'`
    //         const expectedMongoQuery = {}
    //         const result = MongoDbHelper.ConvertSql_v2(sqlQuery)
    //         expect(result).toEqual(expectedMongoQuery)
    //     })
    // })

})
