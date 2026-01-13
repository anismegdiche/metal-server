/* eslint-disable @typescript-eslint/no-explicit-any */


import type { TSchemaRequest, TSchemaRequestDelete, TSchemaRequestInsert, TSchemaRequestListEntities, TSchemaRequestSelect, TSchemaRequestUpdate } from '../types/TSchemaRequest'
import { Schema } from '../Schema';
import { DataTable } from '../../../types/DataTable';
import { HTTP_STATUS_CODE } from '../../core/@consts';
import type { TSchemaResponse } from '../types/TSchemaResponse';
import { z_TSchemaRequestSelect, z_TSchemaRequestUpdate, z_TSchemaRequestDelete, z_TSchemaRequestInsert, z_TSchemaRequestListEntities, z_TSchemaRequest } from "../types/TSchemaRequest";
//


describe('Schema', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('TSchemaRequestSelect', () => {
        it('should validate a valid select request', () => {
            const validRequest: unknown = {
                schema: 'mySchema',
                entity: 'myEntity',
                fields: 'field1,field2',
                filter: { id: 1 },
                sort: { field1: 'asc' },
                cache: 60,
                anonymize: 'fieldToAnonymize',
            }

            const result = z_TSchemaRequestSelect.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestSelect = result.data!
            expect(parsedRequest).toEqual(validRequest)

        })

        it('should validate a minimal select request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity'
            }
            const result = z_TSchemaRequestSelect.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestSelect = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should fail validation when required fields are missing', () => {
            const invalidRequest = {
                schema: 'mySchema'
                // entity missing
            }
            const result = z_TSchemaRequestSelect.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestSelect = result.data!
            expect(parsedRequest).toEqual(undefined)
        })

        it('should fail validation with invalid types', () => {
            const invalidRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                cache: 'invalid-cache-string' // should be number
            }
            const result = z_TSchemaRequestSelect.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestSelect = result.data!
            expect(parsedRequest).toEqual(undefined)
        })

        it('should return true if Schema.IsSchemaRequestSelect returns true', () => {
            vi.spyOn(Schema, 'IsSchemaRequestSelect').mockReturnValue(true);
            expect(Schema.IsSchemaRequestSelect({})).toBe(true);
            expect(Schema.IsSchemaRequestSelect).toHaveBeenCalledWith({});
        });

        it('should return false if Schema.IsSchemaRequestSelect returns false', () => {
            vi.spyOn(Schema, 'IsSchemaRequestSelect').mockReturnValue(false);
            expect(Schema.IsSchemaRequestSelect({})).toBe(false);
        });
    })

    describe('TSchemaRequestUpdate', () => {
        it('should validate a valid update request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                data: { field1: 'newValue' },
                filter: { id: 1 },
                "filter-expression": "id = 1",
                source: 'mySource'
            }
            const result = z_TSchemaRequestUpdate.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestUpdate = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should validate a minimal update request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity'
                // data, filter, filter-expression are optional
            }
            const result = z_TSchemaRequestUpdate.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestUpdate = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should fail validation when required fields are missing', () => {
            const invalidRequest = {
                schema: 'mySchema',
                // entity missing
                data: { field1: 'val' }
            }
            const result = z_TSchemaRequestUpdate.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestUpdate = result.data!
            expect(parsedRequest).toEqual(undefined)
        })

        it('should fail validation with invalid types', () => {
            const invalidRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                data: 'invalid-data-string' // should be object or array of objects
            }
            const result = z_TSchemaRequestUpdate.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestUpdate = result.data!
            expect(parsedRequest).toEqual(undefined)
        })
    })

    describe('TSchemaRequestDelete', () => {
        it('should validate a valid delete request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                filter: { id: 1 },
                "filter-expression": "id > 10",
                source: "mySource"
            }
            const result = z_TSchemaRequestDelete.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestDelete = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should validate a minimal delete request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity'
                // filter, filter-expression are optional
            }
            const result = z_TSchemaRequestDelete.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestDelete = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should fail validation when required fields are missing', () => {
            const invalidRequest = {
                schema: 'mySchema'
                // entity missing
            }
            const result = z_TSchemaRequestDelete.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestDelete = result.data!
            expect(parsedRequest).toEqual(undefined)
        })

        it('should fail validation with invalid types', () => {
            const invalidRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                filter: 'invalid-string-filter' // should be object
            }
            const result = z_TSchemaRequestDelete.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestDelete = result.data!
            expect(parsedRequest).toEqual(undefined)
        })
    })

    describe('TSchemaRequestInsert', () => {
        it('should validate a valid insert request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                data: { field1: 'value1' },
                source: 'mySource'
            }
            const result = z_TSchemaRequestInsert.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestInsert = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should validate a minimal insert request', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity'
                // data is optional
            }
            const result = z_TSchemaRequestInsert.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestInsert = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should fail validation when required fields are missing', () => {
            const invalidRequest = {
                schema: 'mySchema',
                data: { field1: 'val' }
                // entity missing
            }
            const result = z_TSchemaRequestInsert.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestInsert = result.data!
            expect(parsedRequest).toEqual(undefined)
        })

        it('should fail validation with invalid types', () => {
            const invalidRequest = {
                schema: 'mySchema',
                entity: 'myEntity',
                data: 'invalid-string' // should be object or array
            }
            const result = z_TSchemaRequestInsert.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestInsert = result.data!
            expect(parsedRequest).toEqual(undefined)
        })
    })

    describe('TSchemaRequestListEntities', () => {
        it('should validate a valid list entities request', () => {
            const validRequest = {
                schema: 'mySchema'
            }

            const result = z_TSchemaRequestListEntities.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestListEntities = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })


        it('should validate a valid list entities request with source', () => {
            const validRequest = {
                schema: 'mySchema',
                source: 'mySource'
            }
            const result = z_TSchemaRequestListEntities.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequestListEntities = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should fail validation when required fields are missing', () => {
            const invalidRequest = {}
            const result = z_TSchemaRequestListEntities.safeParse(invalidRequest)
            expect(result.success).toBe(false)
        })

        it('should fail validation with invalid types', () => {
            const invalidRequest = {
                schema: 'mySchema',
                source: 123 // should be string
            }
            const result = z_TSchemaRequestListEntities.safeParse(invalidRequest)
            expect(result.success).toBe(false)

            const parsedRequest: TSchemaRequestListEntities = result.data!
            expect(parsedRequest).toEqual(undefined)
        })
    })

    describe('TSchemaRequest (Union)', () => {
        it('should validate a valid request via the union', () => {
            const validRequest = {
                schema: 'mySchema',
                entity: 'myEntity'
            }
            const result = z_TSchemaRequest.safeParse(validRequest)
            expect(result.success).toBe(true)

            const parsedRequest: TSchemaRequest = result.data!
            expect(parsedRequest).toEqual(validRequest)
        })

        it('should return true for valid TSchemaRequest object', () => {
            const schemaRequest: TSchemaRequest = { schema: "test", entity: "test" }
            expect(Schema.IsSchemaRequest(schemaRequest)).toBe(true)
        })

        it('should return false for invalid TSchemaRequest object (missing properties)', () => {
            expect(Schema.IsSchemaRequest({})).toBe(false)
        })

        it('should return false for invalid TSchemaRequest object (wrong property types)', () => {
            expect(Schema.IsSchemaRequest({
                // wrong property types
                schema: 123,
                entity: 'string'
            })).toBe(false)
        })

        it('should return false for non-object input', () => {
            expect(Schema.IsSchemaRequest('hello')).toBe(false)
        })

        it('should return false for null input', () => {
            expect(Schema.IsSchemaRequest(null)).toBe(false)
        })

        it('should return false for undefined input', () => {
            expect(Schema.IsSchemaRequest(undefined)).toBe(false)
        })

        it('should return true if Schema.IsSchemaRequest returns true', () => {
            vi.spyOn(Schema, 'IsSchemaRequest').mockReturnValue(true);
            expect(Schema.IsSchemaRequest({})).toBe(true);
            expect(Schema.IsSchemaRequest).toHaveBeenCalledWith({});
        });

        it('should return false if Schema.IsSchemaRequest returns false', () => {
            vi.spyOn(Schema, 'IsSchemaRequest').mockReturnValue(false);
            expect(Schema.IsSchemaRequest({})).toBe(false);
        });
    });

    describe('IsSchemaResponse', () => {
        beforeEach(() => {
            vi.clearAllMocks();
        })
        afterEach(() => {
            vi.restoreAllMocks();
        })
        it('should return true if Schema.IsSchemaResponse returns true', () => {
            vi.spyOn(Schema, 'IsSchemaResponse').mockReturnValue(true);
            expect(Schema.IsSchemaResponse({})).toBe(true);
            expect(Schema.IsSchemaResponse).toHaveBeenCalledWith({});
        });

        it('should return false if Schema.IsSchemaResponse returns false', () => {
            vi.spyOn(Schema, 'IsSchemaResponse').mockReturnValue(false);
            expect(Schema.IsSchemaResponse({})).toBe(false);
        });

        it('should return true if Schema.IsSchemaResponse is from list entities', async () => {
            vi.clearAllMocks();
            const entitiesData = new DataTable("entities", [
                { name: "entity1", type: "table" },
                { name: "entity2", type: "view" }
            ]);

            await entitiesData.RowsSet()

            const listEntitiesResponse: TSchemaResponse = {
                schema: "mySchema",
                status: HTTP_STATUS_CODE.OK,
                data: entitiesData
            }

            const isSchemaResponse = Schema.IsSchemaResponse(listEntitiesResponse)

            expect(isSchemaResponse).toBe(true);
        });
    });

    describe('IsSchemaResponseWithData', () => {

        it('should return false for invalid TSchemaResponse object (wrong data property types)', async () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: <unknown>{
                    Name: 123,
                    Fields: {
                        name: 'string',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: () => {
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
            expect(Schema.IsSchemaResponse(schemaResponse) && (await schemaResponse.data.Count()) > 0).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (wrong data property values)', async () => {
            const schemaResponse: any = {
                schema: 'test-schema',
                entity: 'test-entity',
                result: 'success',
                status: '200',
                data: <unknown>{
                    Name: 'users',
                    Fields: {
                        name: 'number',
                        email: 'string',
                        country: 'string'
                    },
                    Rows: () => {
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
            expect(Schema.IsSchemaResponse(schemaResponse) && (await schemaResponse.data.Count()) > 0).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Fields property)', async () => {
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
            expect(Schema.IsSchemaResponse(schemaResponse) && (await schemaResponse.data.Count()) > 0).toBe(false)
        })

        it('should return false for invalid TSchemaResponse object (missing Rows property)', async () => {
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
            expect(Schema.IsSchemaResponse(schemaResponse) && (await schemaResponse.data.Count()) > 0).toBe(false)
        })




    });
});
