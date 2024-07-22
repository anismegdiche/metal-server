

import { Convert } from '../Convert'
import { MongoDbHelper } from '../MongoDbHelper'

describe('Convert', () => {

    // SqlSortToMongoSort method returns a MongoDB sort object from a SQL-like sort string
    it('should return a MongoDB sort object when given a valid SQL-like sort string', () => {
        const key = {}
        const value = "field1 ASC"
        const expected = {
            ...key,
            field1: 1
        }

        const result = MongoDbHelper.ConvertSqlSort(key, value)

        expect(result).toEqual(expected)
    })

    // JsonToArray method returns an array of objects from a JSON object
    it('should return an array of objects when given a valid JSON object', () => {
        const obj = {
            field1: "value1",
            field2: "value2"
        }
        const expected = [
            { field1: "value1" },
            { field2: "value2" }
        ]

        const result = Convert.JsonToArray(obj)

        expect(result).toEqual(expected)
    })

    // JsonToArray method returns an empty array when given an empty JSON object
    it('should return an empty array when given an empty JSON object', () => {
        const obj = {}
        const expected: any = []

        const result = Convert.JsonToArray(obj)

        expect(result).toEqual(expected)
    })
})


describe('RequestToSchemaRequest', () => {

    // Returns a TSchemaRequest object with schemaName and entityName properties populated from the request params, and any additional properties from the request body and query.
    it('should populate schemaName and entityName properties from request params, and include additional properties from request body and query', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            },
            body: {
                data: [
                    {
                        id: 1,
                        name: 'John'
                    }
                ],
                fields: 'id,name',
                filter: { id: 1 },
                filterExpression: 'id = 1',
                sort: 'name asc',
                cache: '300'
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'John'
                }
            ],
            fields: 'id,name',
            filter: { id: 1 },
            filterExpression: 'id = 1',
            sort: 'name asc',
            cache: '300'
        })
    })

    // Returns a TSchemaRequest object with only schemaName and entityName properties if the request body and query are empty.
    it('should only include schemaName and entityName properties if request body and query are empty', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: 'testSchema',
            entityName: 'testEntity'
        })
    })

    // Returns a TSchemaRequest object with only schemaName and entityName properties if the request params are empty.
    it('should only include schemaName and entityName properties if request params are empty', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            },
            body: {
                data: [
                    {
                        id: 1,
                        name: 'John'
                    }
                ],
                fields: 'id,name',
                filter: { id: 1 },
                filterExpression: 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: "John"
                }
            ],
            fields: "id,name",
            filter: {
                id: 1
            },
            filterExpression: "id = 1",
            sort: "name asc",
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with only schemaName and entityName properties if the request params are missing schemaName or entityName.
    it('should only include schemaName and entityName properties if request params are missing schemaName or entityName', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            },
            body: {
                data: [
                    {
                        id: 1,
                        name: 'John'
                    }
                ],
                fields: 'id,name',
                filter: { id: 1 },
                filterExpression: 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: "testSchema",
            entityName: "testEntity",
            data: [
                {
                    id: 1,
                    name: "John"
                }
            ],
            fields: "id,name",
            filter: {
                id: 1
            },
            filterExpression: "id = 1",
            sort: "name asc",
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with additional properties from the request body and query, even if they have the same name.
    it('should include additional properties from request body and query, even if they have the same name', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            },
            body: {
                data: [
                    {
                        id: 1,
                        name: 'John'
                    }
                ],
                fields: 'id,name',
                filter: { id: 1 },
                filterExpression: 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'John'
                }
            ],
            fields: 'id,name',
            filter: { id: 1 },
            filterExpression: 'id = 1',
            sort: 'name asc',
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with additional properties from the request body and query, with query properties taking precedence over body properties.
    it('should include additional properties from request body and query, with query properties taking precedence over body properties', () => {
        // Arrange
        const req: any = {
            params: {
                schemaName: 'testSchema',
                entityName: 'testEntity'
            },
            query: {
                fields: 'id',
                filter: { id: 2 },
                filterExpression: 'id = 2',
                sort: 'id desc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schemaName: 'testSchema',
            entityName: 'testEntity',
            fields: 'id',
            filter: { id: 2 },
            filterExpression: 'id = 2',
            sort: 'id desc',
            cache: 300
        })
    })
})
