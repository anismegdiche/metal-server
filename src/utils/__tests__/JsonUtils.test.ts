
import { describe, expect, it, vi } from 'vitest';
import { JsonUtils } from '../JsonUtils';
import * as StringifyModule from '../JsonUtils/Stringify';

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

        it('should fall back to Stringify when JSON.stringify fails', () => {
            const obj: { self?: unknown } = {};
            obj.self = obj;

            vi.spyOn(StringifyModule, 'Stringify').mockReturnValue('{"self":null}');

            const copy = JsonUtils.SafeCopy(obj);

            expect(copy).toEqual({ self: null });
        });

        afterEach(() => {
            vi.restoreAllMocks();
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

    describe('RemoveUselessKeys', () => {
        it('should remove placeholder values and null arrays', () => {
            const obj = {
                remove_object_string: '[Object]',
                remove_null_array: [null, null],
                keep_empty_object: {
                    remove_string_array: '[Array]'
                },
                keep_string: 'ok'
            };
            JsonUtils.RemoveUselessKeys(obj);
            expect(obj).toEqual({
                keep_empty_object: {},
                keep_string: "ok",
            });
        });
    });

    describe('PrefixKeys', () => {
        it('should prefix keys recursively', () => {
            const result = JsonUtils.PrefixKeys({ a: 1, b: { c: 2 } }, 'x_');
            expect(result).toEqual({ x_a: 1, x_b: { x_c: 2 } });
        });
    });

    describe('ReplaceStrings', () => {
        it('should replace strings in nested objects and arrays', () => {
            const data = { a: 'foo', b: ['foo', { c: 'foo' }] };
            const result = JsonUtils.ReplaceStrings(data, /foo/g, 'bar');
            expect(result).toEqual({ a: 'bar', b: ['bar', { c: 'bar' }] });
        });
    });

    describe('RemoveUndefined', () => {
        it('should remove undefined keys', () => {
            const result = JsonUtils.RemoveUndefined({ a: 1, b: undefined });
            expect(result).toEqual({ a: 1 });
        });
    });

    describe('Join', () => {
        it('should join object entries into string', () => {
            const result = JsonUtils.Join({ a: 1, b: 'x' }, ':', '|');
            expect(result).toBe('a:1|b:"x"');
        });
    });

    describe('ToTextList', () => {
        it('should format key/value pairs into lines', () => {
            const result = JsonUtils.ToTextList({ a: 1, b: 'x' });
            expect(result).toContain(' - a: 1');
            expect(result).toContain(' - b: "x"');
        });
    });

    describe('ToArray', () => {
        it('should convert object to array of key/value objects', () => {
            expect(JsonUtils.ToArray({ a: 1, b: 2 })).toEqual([{ a: 1 }, { b: 2 }]);
            expect(JsonUtils.ToArray(undefined)).toEqual([]);
        });
    });

    describe('Size', () => {
        it('should compute byte size', () => {
            expect(JsonUtils.Size({ a: 'x' })).toBeGreaterThan(0);
        });
    });
});
