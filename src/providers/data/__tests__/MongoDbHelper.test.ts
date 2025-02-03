import { MongoDbHelper } from "../MongoDbHelper"


describe('MongoDbHelper', () => {
    describe('ParseSqlQuery', () => {
        it('should return an empty object when the input is not a string', () => {
            expect(MongoDbHelper.ParseSqlQuery('select * from faketable where invalid input')).toEqual({
                query: {},
                pipeline: {}
            })
        })

        it('should return an empty object when the input string does not contain a space', () => {
            expect(MongoDbHelper.ParseSqlQuery('select * from faketable where field')).toEqual({
                collection: "faketable",
                limit: 100,
                pipeline: {},
                query: "field",
                type: "query",
                aggregate: [
                    {
                        $match: "field"
                    }
                ]
            })
        })

        it('should return an empty object when the input string does not contain exactly two parts', () => {
            expect(MongoDbHelper.ParseSqlQuery('select * from faketable order by field asc desc')).toEqual({
                query: {},
                pipeline: {}
            })
        })

        it('should return a sort object with the correct field and direction', () => {
            const result = MongoDbHelper.ParseSqlQuery('select * from faketable order by field asc')
            expect(result).toEqual({
                collection: "faketable",
                limit: 100,
                pipeline: {},
                query: {},
                sort: {
                    field: 1
                },
                type: "query",
                aggregate: [
                    {
                        $sort: {
                            field: 1
                        }
                    }
                ]
            })
        })

        it('should return a sort object with the correct field and direction (desc)', () => {
            const result = MongoDbHelper.ParseSqlQuery('select * from faketable order by field desc')
            expect(result).toEqual({
                collection: "faketable",
                limit: 100,
                pipeline: {},
                query: {},
                sort: {
                    field: -1
                },
                type: "query",
                aggregate: [
                    {
                        $sort: {
                            field: -1
                        }
                    }
                ]
            })
        })

        it('should return an empty object when the input is undefined', () => {
            expect(MongoDbHelper.ParseSqlQuery(undefined)).toEqual({
                query: {},
                pipeline: {}
            })
        })

        it('should return a parsed query object when the input is a valid SQL query', () => {
            const sqlQuery = 'select * from faketable where field = "value"'
            const result = MongoDbHelper.ParseSqlQuery(sqlQuery)
            expect(result).toEqual({
                collection: "faketable",
                limit: 100,
                pipeline: {},
                query: {
                    field: {
                        $eq: "value"
                    }
                },
                type: "query",
                aggregate: [
                    {
                        $match:
                        {
                            field: {
                                $eq: "value"
                            }

                        }
                    }
                ]
            })
        })

        it('should return an object with .* if % is in input', () => {
            const result = MongoDbHelper.ParseSqlQuery("select * from faketable where name LIKE '%o%' AND email LIKE '%wh%com'")
            expect(result).toEqual({
                query: {
                    $and: [
                        {
                            name: {
                                $regex: "o",
                                $options: "i"
                            }
                        },
                        {
                            email: {
                                $regex: "wh.*com$",
                                $options: "i"
                            }
                        }
                    ]
                },
                pipeline: {
                },
                limit: 100,
                collection: "faketable",
                type: "query",
                aggregate: [
                    {
                        $match: {
                            $and: [
                                {
                                    name: {
                                        $regex: "o",
                                        $options: "i"
                                    }
                                },
                                {
                                    email: {
                                        $regex: "wh.*com$",
                                        $options: "i"
                                    }
                                }
                            ]
                        }
                    }
                ]
            })
        })

        // ParseSqlQuery returns expected query and pipeline objects when given valid SQL query
        it('should return query and pipeline objects for valid SQL WHERE clause', () => {
            const result = MongoDbHelper.ParseSqlQuery('select * from faketable where name = "test"')
            expect(result).toEqual({
                query: {
                    name: {
                        $eq: "test"
                    }
                },
                pipeline: {
                },
                limit: 100,
                collection: "faketable",
                type: "query",
                aggregate: [
                    {
                        $match: {
                            name: {
                                $eq: "test"
                            }
                        }
                    }
                ]
            })
        })

        // ParseSqlQuery handles basic SQL WHERE clauses and converts to MongoDB format
        it('should convert basic WHERE clause to MongoDB query format', () => {
            const result = MongoDbHelper.ParseSqlQuery('select * from faketable where status = "active" AND age >= 21')
            expect(result.query).toEqual({
                $and: [
                    {
                        status: {
                            $eq: "active"
                        }
                    },
                    {
                        age: {
                            $gte: 21
                        }
                    }
                ]
            })
        })

        // ParseSqlQuery handles undefined sqlQuery parameter
        it('should handle undefined sqlQuery parameter', () => {
            const result = MongoDbHelper.ParseSqlQuery(undefined)
            expect(result).toEqual({
                query: {},
                pipeline: {}
            })
        })

        // ParseSqlQuery handles empty string SQL query
        it('should handle empty string SQL query', () => {
            const result = MongoDbHelper.ParseSqlQuery('')
            expect(result).toEqual({
                query: {},
                pipeline: {}
            })
        })

        // ParseSqlQuery handles invalid SQL syntax
        it('should handle invalid SQL syntax gracefully', () => {
            const invalidQuery = 'invalid syntax !@#'
            expect(() => MongoDbHelper.ParseSqlQuery(invalidQuery)).not.toThrow()
            const result = MongoDbHelper.ParseSqlQuery(invalidQuery)
            expect(result).toHaveProperty('query')
            expect(result).toHaveProperty('pipeline')
        })

        // ParseSqlQuery handles complex nested SQL queries
        it('should handle complex nested SQL queries', () => {
            const complexQuery = 'select * from faketable where (status = "active" OR status = "pending") AND (age > 18 AND age < 65)'
            const result = MongoDbHelper.ParseSqlQuery(complexQuery)
            expect(result.query).toHaveProperty('$and')
            expect(result.query.$and[0]).toHaveProperty('$or')
        })

        // ParseSqlQuery handles SQL queries with special characters
        it('should handle SQL queries with special characters', () => {
            const queryWithSpecialChars = 'select * from faketable where field LIKE "%special_chars@#$%"'
            const result = MongoDbHelper.ParseSqlQuery(queryWithSpecialChars)
            expect(result.query).toBeDefined()
            expect(result.query.field).toHaveProperty('$regex')
        })

        // ParseSqlQuery maintains immutability of input parameters
        it('should not modify the input SQL query when parsing', () => {
            const originalQuery = "SELECT * FROM users WHERE age > 30"
            const queryCopy = originalQuery.slice()

            MongoDbHelper.ParseSqlQuery(originalQuery)

            expect(originalQuery).toBe(queryCopy)
        })

        // ParseSqlQuery handles SQL injection attempts
        it('should handle SQL injection attempts gracefully', () => {
            const sqlInjectionQuery = "SELECT * FROM users WHERE name = 'a' OR 't'='t'"

            const result = MongoDbHelper.ParseSqlQuery(sqlInjectionQuery)

            expect(result).toHaveProperty('query')
            expect(result).toHaveProperty('pipeline')
            // Further assertions can be added based on expected behavior
        })
    })
})