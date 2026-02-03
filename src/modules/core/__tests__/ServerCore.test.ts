
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerCore } from '../ServerCore';
import { ConfigManager } from '../ConfigManager';
import { Logger } from '../../../utils/Logger';
import { Source } from '../../source/Source';
import { Cache } from '../../cache/Cache';
import { AiEngine } from '../../ai-engine/AiEngine';
import { Plans } from '../../plan/Plans';
import { Schedule } from '../../plan/Schedule';
import { AuthProvider } from '../../auth/AuthProvider';
import { ServerEndpoint } from '../ServerEndpoint';
import { ServerRuntime } from '../ServerRuntime';

vi.mock('../ConfigManager');
vi.mock('../ConfigStore');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        Debug: vi.fn(),
        SetLevel: vi.fn(),
        In: '',
        Out: ''
    }
}));
vi.mock('../../schema/Schema');
vi.mock('../../source/Source');
vi.mock('../../source/DataProvider');
vi.mock('../../cache/Cache', () => ({
    Cache: {
        Init: vi.fn(),
        Connect: vi.fn(),
        Get: vi.fn(),
        IsEnabled: true
    }
}));
vi.mock('../../ai-engine/AiEngine');
vi.mock('../../plan/Plans');
vi.mock('../../plan/Schedule');
vi.mock('../../auth/AuthProvider', () => ({
    AuthProvider: {
        SetCurrent: vi.fn(),
        Provider: {
            Init: vi.fn()
        }
    }
}));
vi.mock('../../auth/Roles');
vi.mock('../ServerEndpoint');
vi.mock('../ServerRuntime');
vi.mock('../../../utils/Convert', () => ({
    Convert: {
        HumainSizeToBytes: vi.fn().mockReturnValue(1024)
    }
}));

describe('ServerCore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Init', () => {
        it('should initialize all components in order', async () => {
            vi.mocked(ConfigManager.Get).mockImplementation((key: string) => {
                if (key === 'server.verbosity') return 'debug';
                if (key === 'server.authentication') return { provider: 'local' };
                if (key === 'server.response-limit') return '10mb';
                return undefined;
            });

            await ServerCore.Init();

            expect(ConfigManager.Init).toHaveBeenCalled();
            expect(Source.Init).toHaveBeenCalled();
            expect(Cache.Init).toHaveBeenCalled();
            expect(Cache.Connect).toHaveBeenCalled();
            expect(AiEngine.Init).toHaveBeenCalled();
            expect(Plans.Init).toHaveBeenCalled();
            expect(Schedule.Init).toHaveBeenCalled();
            expect(AuthProvider.SetCurrent).toHaveBeenCalledWith('local');
            expect(ServerEndpoint.InitApi).toHaveBeenCalled();
            expect(ServerRuntime.StartWatcher).toHaveBeenCalled();
        });
    });
});
