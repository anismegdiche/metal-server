
import { describe, expect, it } from 'vitest';
import { Factory } from '../Factory';

describe('Factory', () => {
    it('should register and get providers', () => {
        const factory = new Factory<number>();
        factory.Register('one', 1);
        expect(factory.Get('one')).toBe(1);
        expect(factory.Has('one')).toBe(true);
    });

    it('should return undefined for non-existent providers', () => {
        const factory = new Factory<number>();
        expect(factory.Get('two')).toBeUndefined();
        expect(factory.Has('two')).toBe(false);
    });
});
