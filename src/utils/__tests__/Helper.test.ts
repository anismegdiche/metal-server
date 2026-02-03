
import { describe, expect, it, vi } from 'vitest';
import { Helper } from '../Helper';
import { Logger } from '../Logger';

vi.mock('../Logger', () => ({
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Error: vi.fn(),
        Debug: vi.fn()
    }
}));

describe('Helper', () => {
    describe('CaseMapNotFound', () => {
        it('should log an error and return undefined', () => {
            const result = Helper.CaseMapNotFound('test-key');
            expect(result).toBeUndefined();
            expect(Logger.Error).toHaveBeenCalledWith("Key 'test-key' not found");
        });
    });
});
