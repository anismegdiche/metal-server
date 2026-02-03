
import { describe, expect, it, vi } from 'vitest';
import { JsonUtils } from '../JsonUtils';

describe('JsonUtils', () => {
    describe('TryParse', () => {
        it('should parse valid JSON', () => {
            const result = JsonUtils.TryParse('{"a":1}', {});
            expect(result).toEqual({ a: 1 });
        });

        it('should return defaultValue for invalid JSON', () => {
            const result = JsonUtils.TryParse('invalid', { def: 1 }, true);
            expect(result).toEqual({ def: 1 });
        });

        it('should return defaultValue for empty string', () => {
            expect(JsonUtils.TryParse('', { a: 1 })).toEqual({ a: 1 });
        });

        it('should parse strings as dates if they look like dates', () => {
            const dateStr = '2023-01-01';
            const result = JsonUtils.TryParse(`{"d":"${dateStr}"}`, {});
            expect((result as any).d).toBeInstanceOf(Date);
        });
    });

    describe('Get', () => {
        it('should get value by path', () => {
            const json = { a: { b: [0, 10] } };
            expect(JsonUtils.Get(json, 'a.b.1')).toBe(10);
            expect(JsonUtils.Get(json, 'a.b[1]')).toBe(10);
        });

        it('should return defaultValue if path not found', () => {
            expect(JsonUtils.Get({}, 'a.b', 'def')).toBe('def');
        });
    });

    describe('Set', () => {
        it('should set value by path', () => {
            const json = { a: 1 };
            JsonUtils.Set(json, 'b', 2);
            expect((json as any).b).toBe(2);
        });
    });

    describe('SafeCopy', () => {
        it('should return a deep copy', () => {
            const json = { a: { b: 1 } };
            const copy = JsonUtils.SafeCopy(json);
            expect(copy).toEqual(json);
            expect(copy).not.toBe(json);
            expect(copy.a).not.toBe(json.a);
        });
    });

    describe('IsEmpty', () => {
        it('should return true for empty object', () => {
            expect(JsonUtils.IsEmpty({})).toBe(true);
        });
        it('should return false for non-empty object', () => {
            expect(JsonUtils.IsEmpty({ a: 1 })).toBe(false);
        });
    });

    describe('IsJson', () => {
        it('should return true for objects, false for others', () => {
            expect(JsonUtils.IsJson({})).toBe(true);
            expect(JsonUtils.IsJson([])).toBe(false);
            expect(JsonUtils.IsJson(null)).toBe(false);
            expect(JsonUtils.IsJson(new Date())).toBe(false);
        });
    });
});
