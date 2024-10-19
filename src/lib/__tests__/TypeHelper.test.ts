import { TypeHelper } from '../TypeHelper'
import { TSchemaResponse } from '../../types/TSchemaResponse'
import typia from "typia"
import { DataTable } from "../../types/DataTable"

describe('TypeHelper.IsSchemaResponseData', () => {

    it('should return true for valid TSchemaResponse object', () => {
        const schemaResponse: TSchemaResponse = typia.random<TSchemaResponse>()
        expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(true)
    })

    it('should return false for invalid TSchemaResponse object (missing properties)', () => {
        const schemaResponse: any = {
            schemaName: 'test-schema',
            entityName: 'test-entity'
        }
        expect(TypeHelper.IsSchemaResponseData(schemaResponse)).toBe(false)
    })

    it('should return false for invalid TSchemaResponse object (wrong property types)', () => {
        const schemaResponse: any = {
            schemaName: 123,
            entityName: 'test-entity',
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
            schemaName: "mem",
            entityName: "users",
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
            schemaName: "mem",
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