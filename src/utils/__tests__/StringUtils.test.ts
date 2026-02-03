
import { describe, expect, it } from 'vitest';
import { StringUtils } from '../StringUtils';

describe('StringUtils', () => {
    describe('Split', () => {
        it('should split string and trim fields', () => {
            expect(StringUtils.Split('a, b , c', ',')).toEqual(['a', 'b', 'c']);
        });
        it('should return array with single string if separator not found', () => {
            expect(StringUtils.Split('abc', ',')).toEqual(['abc']);
        });
    });

    describe('IsEmpty', () => {
        it('should return true for empty or whitespace strings', () => {
            expect(StringUtils.IsEmpty('')).toBe(true);
            expect(StringUtils.IsEmpty('  ')).toBe(true);
            expect(StringUtils.IsEmpty(undefined)).toBe(true);
            expect(StringUtils.IsEmpty(null)).toBe(true);
        });
        it('should return false for non-empty strings', () => {
            expect(StringUtils.IsEmpty('abc')).toBe(false);
        });
    });

    describe('Url', () => {
        it('should join url segments', () => {
            expect(StringUtils.Url('http://host', '/path', 'file')).toBe('http://host/path/file');
        });
    });

    describe('ToString', () => {
        it('should convert various types to string', () => {
            expect(StringUtils.ToString(123)).toBe('123');
            expect(StringUtils.ToString(true)).toBe('true');
            expect(StringUtils.ToString({ a: 1 })).toBe('{"a":1}');
            expect(StringUtils.ToString(null)).toBe('');
        });
    });

    describe('IsBase64', () => {
        it('should detect base64 strings', () => {
            expect(StringUtils.IsBase64('WVVO')).toBe(true);
            expect(StringUtils.IsBase64('invalid')).toBe(false);
        });
    });
});
