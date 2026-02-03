
import { describe, expect, it } from 'vitest';
import { DecoratorUtils } from '../DecoratorUtils';

describe('DecoratorUtils', () => {
    describe('GetParameters', () => {
        it('should extract parameters correctly', () => {
            function testFn(a: number, b: string) { return a + b; }
            const params = DecoratorUtils.GetParameters(testFn, 1, 'two');
            expect(params).toEqual({ a: 1, b: 'two' });
        });

        it('should handle arrow functions', () => {
            const testFn = (x: any, y: any) => { };
            const params = DecoratorUtils.GetParameters(testFn, 10, 20);
            expect(params).toEqual({ x: 10, y: 20 });
        });

        it('should return empty object for functions without parameters', () => {
            function noParams() { }
            const params = DecoratorUtils.GetParameters(noParams);
            expect(params).toEqual({});
        });
    });
});
