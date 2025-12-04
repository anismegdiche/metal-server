/* eslint-disable @typescript-eslint/no-explicit-any */
import { mock_Logger } from '../../__tests__/mockers'
mock_Logger()

import { TypeUtils } from '../TypeUtils';
import { Validator } from '../Validator';
import { DataTable } from '../../types/DataTable';
import { HttpErrorInternalServerError } from '../../modules/errors/HttpErrors';
import { TSchemaRequest } from '../../modules/schema/types/TSchemaRequest'
import typia from "typia"


describe('TypeUtils', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('IsSchemaRequest', () => {

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

        it('should return true if Validator.SchemaRequest returns true', () => {
            jest.spyOn(Validator, 'SchemaRequest').mockReturnValue(true);
            expect(TypeUtils.IsSchemaRequest({})).toBe(true);
            expect(Validator.SchemaRequest).toHaveBeenCalledWith({});
        });

        it('should return false if Validator.SchemaRequest returns false', () => {
            jest.spyOn(Validator, 'SchemaRequest').mockReturnValue(false);
            expect(TypeUtils.IsSchemaRequest({})).toBe(false);
        });
    });

    describe('IsSchemaRequestSelect', () => {
        it('should return true if Validator.SchemaRequestSelect returns true', () => {
            jest.spyOn(Validator, 'SchemaRequestSelect').mockReturnValue(true);
            expect(TypeUtils.IsSchemaRequestSelect({})).toBe(true);
            expect(Validator.SchemaRequestSelect).toHaveBeenCalledWith({});
        });

        it('should return false if Validator.SchemaRequestSelect returns false', () => {
            jest.spyOn(Validator, 'SchemaRequestSelect').mockReturnValue(false);
            expect(TypeUtils.IsSchemaRequestSelect({})).toBe(false);
        });
    });

    describe('IsSchemaResponse', () => {
        it('should return true if Validator.SchemaResponse returns true', () => {
            jest.spyOn(Validator, 'SchemaResponse').mockReturnValue(true);
            expect(TypeUtils.IsSchemaResponse({})).toBe(true);
            expect(Validator.SchemaResponse).toHaveBeenCalledWith({});
        });

        it('should return false if Validator.SchemaResponse returns false', () => {
            jest.spyOn(Validator, 'SchemaResponse').mockReturnValue(false);
            expect(TypeUtils.IsSchemaResponse({})).toBe(false);
        });
    });

    describe('IsSchemaResponseWithData', () => {

        it('should return false for invalid TSchemaResponse object (wrong data property types)', () => {
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

        it('should return true if Validator.SchemaResponse returns true and data is DataTable', () => {
            jest.spyOn(Validator, 'SchemaResponse').mockReturnValue(true);
            const mockData = { data: {} };
            // Mock DataTable.Is to return true
            const dataTableIsSpy = jest.spyOn(DataTable, 'Is').mockReturnValue(true);

            expect(TypeUtils.IsSchemaResponseWithData(mockData as any)).toBe(true);
            expect(Validator.SchemaResponse).toHaveBeenCalledWith(mockData);
            expect(DataTable.Is).toHaveBeenCalledWith(mockData.data);

            dataTableIsSpy.mockRestore();
        });

        it('should return false if Validator.SchemaResponse returns false', () => {
            jest.spyOn(Validator, 'SchemaResponse').mockReturnValue(false);
            expect(TypeUtils.IsSchemaResponseWithData({} as any)).toBe(false);
        });

        it('should return false if data is not DataTable', () => {
            jest.spyOn(Validator, 'SchemaResponse').mockReturnValue(true);
            const mockData = { data: {} };
            const dataTableIsSpy = jest.spyOn(DataTable, 'Is').mockReturnValue(false);

            expect(TypeUtils.IsSchemaResponseWithData(mockData as any)).toBe(false);

            dataTableIsSpy.mockRestore();
        });


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
            expect(TypeUtils.IsSchemaResponseWithData(schemaResponse)).toBe(false)
        })

    });

    describe('Validate', () => {
        it('should return undefined if res.success is true', () => {
            expect(TypeUtils.Validate({ success: true })).toBeUndefined();
        });

        it('should throw HttpError with formatted message if res.success is false', () => {
            const res = {
                success: false,
                errors: [
                    { path: '$input.field', expected: 'string' }
                ]
            };

            try {
                TypeUtils.Validate(res);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError);
                expect(error.Name).toBe('Bad Parameters');
                expect(Array.isArray(error.message)).toBe(true);
                expect(error.message[0]).toContain('field expected to be string');
            }
        });

        it('should use provided HttpError', () => {
            const res = {
                success: false,
                errors: [
                    { path: '$input.field', expected: 'string' }
                ]
            };
            const customError = new HttpErrorInternalServerError();
            customError.Name = "CustomError";

            try {
                TypeUtils.Validate(res, customError);
                fail('Should have thrown an error');
            } catch (error: any) {
                expect(error).toBe(customError);
                expect(error.Name).toBe('Bad Parameters'); // It gets overwritten
            }
        });
    });

    describe('GetType', () => {
        it('should return "null" for null', () => {
            expect(TypeUtils.GetType(null)).toBe('null');
        });

        it('should return typeof for primitives', () => {
            expect(TypeUtils.GetType('string')).toBe('string');
            expect(TypeUtils.GetType(123)).toBe('number');
            expect(TypeUtils.GetType(true)).toBe('boolean');
            expect(TypeUtils.GetType(undefined)).toBe('undefined');
        });

        it('should return "array" for arrays', () => {
            expect(TypeUtils.GetType([])).toBe('array');
        });

        it('should return "date" for Date objects', () => {
            expect(TypeUtils.GetType(new Date())).toBe('date');
        });

        it('should return constructor name for custom objects', () => {
            class MyClass { }
            expect(TypeUtils.GetType(new MyClass())).toBe('MyClass');
        });

        it('should return "object" for plain objects', () => {
            expect(TypeUtils.GetType({})).toBe('object'); // Constructor name of plain object is Object
        });

        it('should return "object" if constructor is missing or invalid', () => {
            const obj = Object.create(null);
            expect(TypeUtils.GetType(obj)).toBe('object');
        });
    });
});
