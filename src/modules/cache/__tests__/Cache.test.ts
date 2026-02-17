
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { Cache } from '../Cache';
import { ConfigManager } from '../../core/ConfigManager';

vi.mock('../../core/ConfigManager');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: {
        DEBUG: 'debug'
    },
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        Warn: vi.fn(),
        Debug: vi.fn(),
        In: '',
        Out: ''
    }
}));
vi.mock('../../schema/Schema', () => ({
    Schema: {
        IsSchemaRequestSelect: vi.fn().mockReturnValue(true),
        IsSchemaResponse: vi.fn().mockReturnValue(true)
    }
}));
vi.mock('../../../utils/SynchronizerManager', () => ({
    SynchronizerManager: {
        Synchronized: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
    }
}));

describe('Cache', () => {
    let mockDataSource: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDataSource = {
            Init: vi.fn(),
            Connect: vi.fn(),
            Disconnect: vi.fn(),
            Select: vi.fn().mockResolvedValue({ Body: { data: { Count: () => 0, Rows: () => [] } } }),
            Insert: vi.fn(),
            Update: vi.fn(),
            Delete: vi.fn(),
            EscapeField: vi.fn(f => f)
        };
        Cache.IsEnabled = false;
        Cache.Index.clear();
        vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
            if (key === 'schemas.s') return { roles: [] };
            return undefined;
        });
    });

    afterEach(() => {
        Cache.StopAutoCleanup();
    });

    describe('Init', () => {
        it('should initialize if enabled in config', async () => {
            vi.mocked(ConfigManager.Has).mockReturnValue(true);
            vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
                if (key === 'server.cache') return { provider: 'test', database: 'cache_db' };
                return undefined;
            });

            const getProvider = vi.fn().mockResolvedValue(mockDataSource);

            await Cache.Init(getProvider);

            expect(Cache.IsEnabled).toBe(true);
            expect(Cache.Database).toBe('cache_db');
            expect(getProvider).toHaveBeenCalledWith('test');
            expect(mockDataSource.Init).toHaveBeenCalled();
        });
    });

    describe('Get', () => {
        it('should return cached data if valid', async () => {
            Cache.IsEnabled = true;
            Cache.DataSource = mockDataSource;
            vi.spyOn(Cache as any, 'IsArgumentsValid').mockReturnValue(true);
            vi.spyOn(Cache as any, 'IsCacheValid').mockReturnValue(true);

            const hash = Cache.Hash({ schema: 's', entity: 'e' });
            Cache.Index.set(hash, Date.now() + 10000);

            const mockData = { some: 'data' };
            mockDataSource.Select.mockResolvedValue({
                Body: {
                    data: {
                        Count: () => 1,
                        Row: (_index: number) => ({ data: mockData })
                    }
                }
            });

            const res = await Cache.Get({ schema: 's', entity: 'e' } as any);

            expect(res?.Body?.data).toBe(mockData);
        });
    });
});