
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerRuntime } from '../ServerRuntime';
import { Roles } from '../../auth/Roles';
import { ServerShutdown } from '../ServerShutdown';
import { Schedule } from '../../plan/Schedule';
import { ConfigManager } from '../ConfigManager';
import { HttpResponse } from '../HttpResponse';
import { SERVER } from '../@consts';

vi.mock('../../auth/Roles');
vi.mock('../ServerShutdown');
vi.mock('../../plan/Schedule');
vi.mock('../../cache/Cache');
vi.mock('../../source/Source');
vi.mock('../ConfigManager', () => ({
    ConfigManager: {
        Init: vi.fn(),
        ConfigFilePath: 'mock-config-path'
    }
}));
vi.mock('../ConfigStore');
vi.mock('../../utils/Logger', () => ({
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        Debug: vi.fn(),
        In: '',
        Out: ''
    }
}));

describe('ServerRuntime', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GetInfo', () => {
        it('should return server name and version', async () => {
            const res = await ServerRuntime.GetInfo();
            expect(res.Body).toEqual({
                server: SERVER.NAME,
                version: SERVER.VERSION
            });
        });
    });

    describe('Reload', () => {
        it('should check permission and reload components', async () => {
            const userToken = { user: 'admin' };
            await ServerRuntime.Reload(userToken as any);

            expect(Roles.CheckPermission).toHaveBeenCalled();
            expect(Schedule.StopAll).toHaveBeenCalled();
            expect(ConfigManager.Init).toHaveBeenCalled();
        });
    });

    describe('Stop', () => {
        it('should check permission and call shutdown', async () => {
            // ServerShutdown.Shutdown is mocked
            await ServerRuntime.Stop({ user: 'admin' } as any);
            expect(Roles.CheckPermission).toHaveBeenCalled();
            expect(ServerShutdown.Shutdown).toHaveBeenCalledWith('MANUAL_STOP');
        });
    });
});
