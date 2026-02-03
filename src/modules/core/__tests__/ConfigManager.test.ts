
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigManager } from '../ConfigManager';
import * as Fs from 'node:fs';
import * as Yaml from 'js-yaml';
import { z_U_config } from '../types/U_config';

vi.mock('node:fs');
vi.mock('js-yaml');
vi.mock('dotenv', () => ({
    config: vi.fn()
}));
vi.mock('../../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        Debug: vi.fn(),
        In: '',
        Out: ''
    },
    LOGGER_DEFAULT_LEVEL: 'info'
}));

describe('ConfigManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ConfigManager.configStore = undefined;
    });

    describe('Load', () => {
        it('should load and interpolate config correctly', async () => {
            const yamlContent = 'server:\n  port: ${PORT}';
            vi.mocked(Fs.readFileSync).mockReturnValue(yamlContent);
            vi.mocked(Yaml.load).mockImplementation((str) => ({ server: { port: parseInt(str.split(': ')[1]) } }));

            process.env.PORT = '4000';
            const config = await ConfigManager.Load();

            expect(config.server.port).toBe(4000);
            expect(Fs.readFileSync).toHaveBeenCalledWith(ConfigManager.ConfigFilePath, 'utf8');
        });
    });

    describe('Init', () => {
        it('should initialize configStore with validated config', async () => {
            const mockStore = {
                Init: vi.fn(),
                Configuration: {} as any
            };

            const mockConfig = { server: { port: 3000 } };
            vi.spyOn(ConfigManager, 'Load').mockResolvedValue(mockConfig as any);
            vi.spyOn(ConfigManager, 'Validate').mockResolvedValue(mockConfig as any);

            await ConfigManager.Init(mockStore as any);

            expect(mockStore.Init).toHaveBeenCalledWith(expect.objectContaining(mockConfig));
            expect(ConfigManager.configStore).toBe(mockStore);
        });
    });

    describe('Get / Set', () => {
        it('should get and set values via configStore', () => {
            const mockStore = {
                Configuration: { a: { b: 1 } }
            };
            ConfigManager.configStore = mockStore as any;

            expect(ConfigManager.Get('a.b')).toBe(1);

            ConfigManager.Set('a.c', 2);
            expect((mockStore.Configuration as any).a.c).toBe(2);
        });

        it('should throw if configStore is not initialized', () => {
            expect(() => ConfigManager.Get('a')).toThrow("ConfigStore is not initialized");
        });
    });
});
