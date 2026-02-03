
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DataProvider } from '../DataProvider';
import { DATA_PROVIDER } from '../@consts';

// Mock some of the provider modules
vi.mock('../providers/PostgresData', () => ({
    PostgresData: class {
        Clone() { return new (this.constructor as any)(); }
    }
}));
vi.mock('../providers/MemoryData', () => ({
    MemoryData: class {
        Clone() { return new (this.constructor as any)(); }
    }
}));

describe('DataProvider', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear private static state using reflections or by just knowing it will persist
        // (Better to use fresh state if possible, but static private is hard)
    });

    it('should load and register a provider', async () => {
        const provider = await DataProvider.GetProvider(DATA_PROVIDER.POSTGRES);
        expect(provider).toBeDefined();
    });

    it('should throw for unknown provider', async () => {
        await expect(DataProvider.GetProvider('unknown' as any)).rejects.toThrow();
    });

    it('should return a clone on subsequent calls', async () => {
        const p1 = await DataProvider.GetProvider(DATA_PROVIDER.MEMORY);
        const p2 = await DataProvider.GetProvider(DATA_PROVIDER.MEMORY);
        expect(p1).not.toBe(p2); // Should be clones
    });
});
