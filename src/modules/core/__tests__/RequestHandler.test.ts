
import { describe, expect, it } from 'vitest';
import { RequestHandler } from '../RequestHandler';

describe('RequestHandler', () => {
    it('should throw if __METAL_CURRENT_USER is missing', () => {
        expect(() => RequestHandler.CheckRequest({})).toThrow();
    });

    it('should not throw if __METAL_CURRENT_USER is present', () => {
        expect(() => RequestHandler.CheckRequest({ __METAL_CURRENT_USER: {} })).not.toThrow();
    });
});
