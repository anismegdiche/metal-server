
import { describe, expect, it } from 'vitest';
import { Validator } from '../Validator';

describe('Validator', () => {
    describe('TUserCredentials', () => {
        it('should return true for valid credentials', () => {
            const valid = {
                username: 'admin',
                password: 'password'
            };
            expect(Validator.TUserCredentials(valid)).toBe(true);
        });

        it('should return false for invalid credentials', () => {
            const invalid = {
                username: 'admin',
                // missing password
            };
            expect(Validator.TUserCredentials(invalid)).toBe(false);
        });
    });

    describe('TEndpoint', () => {
        it('should return true for valid endpoint', () => {
            const valid = {
                Method: 'GET',
                Url: 'http://example.com',
                Data: {}
            };
            expect(Validator.TEndpoint(valid)).toBe(true);
        });

        it('should return false for invalid endpoint', () => {
            const invalid = {
                Method: 'GET',
                // missing Url
                Data: {}
            };
            expect(Validator.TEndpoint(invalid)).toBe(false);
        });
    });
});
