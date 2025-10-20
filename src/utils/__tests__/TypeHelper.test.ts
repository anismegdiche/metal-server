/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypeUtils } from '../TypeUtils'
import { TSchemaRequest } from '../../modules/schema/types/TSchemaRequest'
import { TSchemaResponse } from '../../modules/schema/types/TSchemaResponse'
import typia from "typia"
import { DataTable } from "../../types/DataTable"

describe('TypeHelper', () => {

    describe('IsSchemaRequest', () => {

        it('should return false for invalid TSchemaResponse object (wrong data property types)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: <unknown>{
                    Name: 123,
                    GetFields: () => {
                        return {
                            name: 'string',
                            email: 'string',
                            country: 'string'
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong data property values)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: <unknown>{
                    Name: 'users',
                    GetFields: () => {
                        return {
                            name: 'number',
                            email: 'string',
                            country: 'string'
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: <unknown>{
                    Name: 'users',
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Rows property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Fields: {
                        name: 'string',
                        email: 'string',
                        country: 'string'
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return true for valid TSchemaRequest object', () => {
            const schemaRequest: TSchemaRequest = typia.random<TSchemaRequest>()
            expect(TypeUtils.IsSchemaRequest(schemaRequest)).toBe(true)
        })

        it('should return false for invalid TSchemaRequest object (missing properties)', () => {
            expect(TypeUtils.IsSchemaRequest({})).toBe(false)
        })

        it('should return false for invalid TSchemaRequest object (wrong property types)', () => {
            expect(TypeUtils.IsSchemaRequest({
                // wrong property types
                schema: 123,
                entity: 'string'
            })).toBe(false)
        })

        it('should return false for non-object input', () => {
            expect(TypeUtils.IsSchemaRequest('hello')).toBe(false)
        })

        it('should return false for null input', () => {
            expect(TypeUtils.IsSchemaRequest(null)).toBe(false)
        })

        it('should return false for undefined input', () => {
            expect(TypeUtils.IsSchemaRequest(undefined)).toBe(false)
        })
    })

    describe('IsSchemaResponseData', () => {
        it('should return false for invalid TSchemaResponse object (wrong data property types)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    GetFields: () => {
                        return {
                            name: 'number',
                            email: 'string',
                            country: 'string'
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong data property values)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 123,
                    GetFields: () => {
                        return {
                            name: 'string',
                            email: 'string',
                            country: 'string'
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Rows property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Fields: {
                        name: 'string',
                        email: 'string',
                        country: 'string'
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (empty Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    GetFields: () => {
                        return {}
                    },
                    GetRows: () => {
                        return [
                            {
                                name: 'John Doe',
                                email: 'j.doe@nowhere.com',
                                country: 'France'
                            }
                        ]
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (empty Rows property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    GetFields: () => {
                        return {
                            name: 'string',
                            email: 'string',
                            country: 'string'
                        }
                    },
                    GetRows: () => {
                        return []
                    },
                    MetaData: {}
                }
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })
        it('should return true for valid TSchemaResponse object', () => {
            const schemaResponse: TSchemaResponse = typia.random<TSchemaResponse>() as unknown as TSchemaResponse
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(true)
        })

        it('should return false for invalid TSchemaResponse object (missing properties)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity'
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong property types)', () => {
            const schemaResponse: any = {
                schema: 123,
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: 'not an object'
            }
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('should return false for missing data in TSchemaResponse object', () => {
            const schemaResponse: any = typia.random<TSchemaResponse>()
            delete schemaResponse.data
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

        it('UC 1', () => {
            const schemaResponse: any = {
                schema: "mem",
                entity: "users",
                status: 200,
                data: {
                    Name: "users",
                    GetFields: () => {
                        return {
                            name: "string",
                            email: "string",
                            country: "string"
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: "John Doe",
                                email: "j.doe@nowhere.com",
                                country: "France"
                            },
                            {
                                name: "Mary Jane",
                                email: "mary@somewhere.com",
                                country: "USA"
                            },
                            {
                                name: "John Doe",
                                email: "j.doe@nowhere.com",
                                country: "France"
                            },
                            {
                                name: "Mary Jane",
                                email: "mary@somewhere.com",
                                country: "USA"
                            }
                        ]
                    },
                    MetaData: {
                    }
                }
            }
            expect(typia.equals<TSchemaResponse>(schemaResponse)).toBe(true)
            expect(typia.equals<DataTable>(schemaResponse.data)).toBe(true)
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(true)
        })

        it('UC 2', () => {
            const schemaResponse: any = {
                schema: "mem",
                status: 200,
                data: {
                    Name: "mem-entities",
                    GetFields: () => {
                        return {
                            name: "string",
                            type: "string",
                            size: "number"
                        }
                    },
                    GetRows: () => {
                        return [
                            {
                                name: "users",
                                type: "datatable",
                                size: 2
                            }
                        ]
                    },
                    MetaData: {
                    }
                }
            }
            expect(typia.equals<TSchemaResponse>(schemaResponse)).toBe(true)
            expect(typia.equals<DataTable>(schemaResponse.data)).toBe(true)
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(true)
        })
    })
})