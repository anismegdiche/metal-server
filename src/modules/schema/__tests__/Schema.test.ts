
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Schema } from '../Schema';
import { ConfigManager } from '../../core/ConfigManager';
import { Source } from '../../source/Source';
import { Roles } from '../../auth/Roles';

vi.mock('../../core/ConfigManager');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Warn: vi.fn(),
        Error: vi.fn(),
        In: '',
        Out: ''
    }
}));
vi.mock('../../source/Source');
vi.mock('../../auth/Roles');

describe('Schema', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Schema.fnCacheGet = vi.fn().mockResolvedValue(undefined);
    });

    describe('GetSchemaConfig', () => {
        it('should return config if exists', () => {
            vi.mocked(ConfigManager.Get).mockReturnValue({ roles: ['admin'] });
            const config = Schema.GetSchemaConfig('test');
            expect(config).toEqual({ roles: ['admin'] });
        });

        it('should throw if not found', () => {
            vi.mocked(ConfigManager.Get).mockReturnValue(undefined);
            expect(() => Schema.GetSchemaConfig('test')).toThrow();
        });
    });

    describe('Select', () => {
        it('should call data provider select if no cache', async () => {
            const schemaConfig = { source: 'db1' };
            vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
                if (key === 'schemas.s') return schemaConfig;
                if (key === 'sources.db1') return {};
                return undefined;
            });
            vi.mocked(ConfigManager.Has).mockReturnValue(true);

            const mockDataProvider = {
                Select: vi.fn().mockResolvedValue({ Body: { data: { FieldsSet: vi.fn(), Count: () => 0 } } })
            };
            Source.Sources.set('db1', { DataProvider: mockDataProvider } as any);

            await Schema.Select({ schema: 's', entity: 'e' } as any);

            expect(mockDataProvider.Select).toHaveBeenCalled();
            expect(Roles.CheckPermission).toHaveBeenCalled();
        });
    });
});
