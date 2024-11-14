/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypeHelper } from '../TypeHelper'
import { TSchemaRequest } from '../../types/TSchemaRequest'
import { TSchemaResponse } from '../../types/TSchemaResponse'
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
                data: {
                    Name: 123,
                    Fields: {
                        name: 'string',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong data property values)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Fields: {
                        name: 'number',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
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
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return true for valid TSchemaRequest object', () => {
            const schemaRequest: TSchemaRequest = typia.random<TSchemaRequest>()
            expect(TypeHelper.IsSchemaRequest(schemaRequest)).toBe(true)
        })

        it('should return false for invalid TSchemaRequest object (missing properties)', () => {
            expect(TypeHelper.IsSchemaRequest({})).toBe(false)
        })

        it('should return false for invalid TSchemaRequest object (wrong property types)', () => {
            expect(TypeHelper.IsSchemaRequest({
                // wrong property types
                schema: 123,
                entity: 'string'
            })).toBe(false)
        })

        it('should return false for non-object input', () => {
            expect(TypeHelper.IsSchemaRequest('hello')).toBe(false)
        })

        it('should return false for null input', () => {
            expect(TypeHelper.IsSchemaRequest(null)).toBe(false)
        })

        it('should return false for undefined input', () => {
            expect(TypeHelper.IsSchemaRequest(undefined)).toBe(false)
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
                    Fields: {
                        name: 'number',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong data property values)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 123,
                    Fields: {
                        name: 'string',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
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
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (empty Fields property)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: {
                    Name: 'users',
                    Fields: {},
                    Rows: [
                        {
                            name: 'John Doe',
                            email: 'j.doe@nowhere.com',
                            country: 'France'
                        }
                    ],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (empty Rows property)', () => {
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
                    Rows: [],
                    MetaData: {}
                }
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })
        it('should return true for valid TSchemaResponse object', () => {
            const schemaResponse: TSchemaResponse = typia.random<TSchemaResponse>()
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(true)
        })

        it('should return false for invalid TSchemaResponse object (missing properties)', () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity'
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong property types)', () => {
            const schemaResponse: any = {
                schema: 123,
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: 'not an object'
            }
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('should return false for missing data in TSchemaResponse object', () => {
            const schemaResponse: any = typia.random<TSchemaResponse>()
            delete schemaResponse.data
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
        })

        it('UC 1', () => {
            const schemaResponse: any = {
                schema: "mem",
                entity: "users",
                result: "OK",
                status: 200,
                data: {
                    Name: "users",
                    Fields: {
                        name: "string",
                        email: "string",
                        country: "string"
                    },
                    Rows: [
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
                    ],
                    MetaData: {
                    }
                }
            }
            expect(typia.equals<TSchemaResponse>(schemaResponse)).toBe(true)
            expect(typia.equals<DataTable>(schemaResponse.data)).toBe(true)
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(true)
        })

        it('UC 2', () => {
            const schemaResponse: any = {
                schema: "mem",
                result: "OK",
                status: 200,
                data: {
                    Name: "mem-entities",
                    Fields: {
                        name: "string",
                        type: "string",
                        size: "number"
                    },
                    Rows: [
                        {
                            name: "users",
                            type: "datatable",
                            size: 2
                        }
                    ],
                    MetaData: {
                    }
                }
            }
            expect(typia.equals<TSchemaResponse>(schemaResponse)).toBe(true)
            expect(typia.equals<DataTable>(schemaResponse.data)).toBe(true)
            expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(true)
        })
    })
})