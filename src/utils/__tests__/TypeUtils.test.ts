/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZodSafeParseResult } from 'zod';
import type { U_config } from '../../modules/core/types/U_config';
import { HttpErrorInternalServerError } from '../../modules/errors/HttpErrors';
import { TypeUtils } from '../TypeUtils';
//


describe('TypeUtils', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Validate', () => {
        it('should return undefined if res.success is true', () => {
            expect(TypeUtils.Validate(<ZodSafeParseResult<U_config>>{ success: true })).toBeUndefined();
        });

        it('should throw HttpError with formatted message if res.success is false (Zod format)', () => {
            const res = <ZodSafeParseResult<U_config>>{
                success: false,
                error: {
                    issues: [
                        { path: ['field'], message: 'Expected string, received number' }
                    ]
                }
            };

            try {
                TypeUtils.Validate(res);
            } catch (error: any) {
                expect(error).toBeInstanceOf(HttpErrorInternalServerError);
                expect(error.Name).toBe('Bad Parameters');
            }
        });

        it('should use provided HttpError', () => {
            const res = {
                success: false,
                error: {
                    issues: [
                        { path: ['field'], message: 'Expected string, received number' }
                    ]
                }
            };
            const customError = new HttpErrorInternalServerError();
            customError.Name = "CustomError";

            try {
                TypeUtils.Validate(<ZodSafeParseResult<U_config>>res, customError);
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
