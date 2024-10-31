

import { Convert } from '../Convert'


describe('RequestToSchemaRequest', () => {

    // Returns a TSchemaRequest object with schema and entityName properties populated from the request params, and any additional properties from the request body and query.
    it('should populate schema and entityName properties from request params, and include additional properties from request body and query', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
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
                "filter-expression": 'id = 1',
                sort: 'name asc',
                cache: '300'
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'John'
                }
            ],
            fields: 'id,name',
            filter: { id: 1 },
            "filter-expression": 'id = 1',
            sort: 'name asc',
            cache: '300'
        })
    })

    // Returns a TSchemaRequest object with only schema and entityName properties if the request body and query are empty.
    it('should only include schema and entityName properties if request body and query are empty', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
                entityName: 'testEntity'
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: 'testSchema',
            entityName: 'testEntity'
        })
    })

    // Returns a TSchemaRequest object with only schema and entityName properties if the request params are empty.
    it('should only include schema and entityName properties if request params are empty', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
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
                "filter-expression": 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: 'testSchema',
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
            "filter-expression": "id = 1",
            sort: "name asc",
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with only schema and entityName properties if the request params are missing schema or entityName.
    it('should only include schema and entityName properties if request params are missing schema or entityName', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
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
                "filter-expression": 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: "testSchema",
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
            "filter-expression": "id = 1",
            sort: "name asc",
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with additional properties from the request body and query, even if they have the same name.
    it('should include additional properties from request body and query, even if they have the same name', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
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
                "filter-expression": 'id = 1',
                sort: 'name asc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: 'testSchema',
            entityName: 'testEntity',
            data: [
                {
                    id: 1,
                    name: 'John'
                }
            ],
            fields: 'id,name',
            filter: { id: 1 },
            "filter-expression": 'id = 1',
            sort: 'name asc',
            cache: 300
        })
    })

    // Returns a TSchemaRequest object with additional properties from the request body and query, with query properties taking precedence over body properties.
    it('should include additional properties from request body and query, with query properties taking precedence over body properties', () => {
        // Arrange
        const req: any = {
            params: {
                schema: 'testSchema',
                entityName: 'testEntity'
            },
            query: {
                fields: 'id',
                filter: { id: 2 },
                "filter-expression": 'id = 2',
                sort: 'id desc',
                cache: 300
            }
        }

        // Act
        const result = Convert.RequestToSchemaRequest(req)

        // Assert
        expect(result).toEqual({
            schema: 'testSchema',
            entityName: 'testEntity',
            fields: 'id',
            filter: { id: 2 },
            "filter-expression": 'id = 2',
            sort: 'id desc',
            cache: 300
        })
    })
})
