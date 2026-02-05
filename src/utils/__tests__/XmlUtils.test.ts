
import { describe, expect, it } from 'vitest';
import { XmlUtils } from '../XmlUtils';

describe('XmlUtils', () => {
    describe('GetNodeByPath', () => {
        it('should return node at path', () => {
            const xml = { a: { b: { c: 1 } } };
            expect(XmlUtils.GetNodeByPath(xml, 'a.b.c')).toBe(1);
            expect(XmlUtils.GetNodeByPath(xml, 'a.b')).toEqual({ c: 1 });
        });

        it('should return undefined if path not found', () => {
            const xml = { a: { b: 1 } };
            expect(XmlUtils.GetNodeByPath(xml, 'a.c')).toBeUndefined();
            expect(XmlUtils.GetNodeByPath(xml, 'x.y')).toBeUndefined();
        });
    });

    describe('SetNodeByPath', () => {
        it('should set node at path and return xml', () => {
            const xml = { a: { b: 1 } };
            const result = XmlUtils.SetNodeByPath(xml, 'a.c', 2);
            expect(result).toBe(xml);
            expect((xml as unknown as { a: { c: number } }).a.c).toBe(2);
        });

        it('should create missing segments', () => {
            const xml: any = {};
            XmlUtils.SetNodeByPath(xml, 'x.y.z', 10);
            expect(xml.x.y.z).toBe(10);
        });
    });
});
