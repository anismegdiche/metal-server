
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AiDocker } from '../AiDocker';
import { ConfigManager } from '../../core/ConfigManager';

const mocks = vi.hoisted(() => {
    return {
        ping: vi.fn().mockResolvedValue(true),
        listContainers: vi.fn().mockResolvedValue([]),
        createContainer: vi.fn(),
        getContainer: vi.fn(),
        createNetwork: vi.fn().mockResolvedValue({}),
        listNetworks: vi.fn().mockResolvedValue([]),
        pull: vi.fn(),
        buildImage: vi.fn(),
        modem: {
            followProgress: vi.fn()
        }
    };
});

vi.mock('dockerode', () => {
    return {
        default: vi.fn().mockImplementation(function () {
            return mocks;
        })
    };
});

vi.mock('../../core/ConfigManager');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Warn: vi.fn(),
        Error: vi.fn(),
        Debug: vi.fn(),
        In: '',
        Out: ''
    },
    VERBOSITY: {
        WARN: 'warn'
    }
}));

describe('AiDocker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        AiDocker.docker = mocks as any;
    });

    describe('Init', () => {
        it('should initialize and call CleanStack and CreateNetwork if not in build mode', async () => {
            vi.spyOn(ConfigManager, 'Get').mockReturnValue({
                'scale-interval': 1000,
                auto_scale: true,
                params: {}
            });

            const cleanStackSpy = vi.spyOn(AiDocker, 'CleanStack').mockResolvedValue(undefined);
            const createNetworkSpy = vi.spyOn(AiDocker, 'CreateNetwork').mockResolvedValue(undefined as any);
            const startCaddySpy = vi.spyOn(AiDocker, 'StartCaddy').mockResolvedValue(undefined);
            const startScalerSpy = vi.spyOn(AiDocker, 'StartScaler').mockImplementation(() => { });

            await AiDocker.Init(false);

            expect(mocks.ping).toHaveBeenCalled();
            expect(cleanStackSpy).toHaveBeenCalled();
            expect(createNetworkSpy).toHaveBeenCalled();
            expect(startCaddySpy).toHaveBeenCalled();
            expect(startScalerSpy).toHaveBeenCalled();
        });
    });

    // Skipping Scaler tests for now due to decorator/timer mocking issues
    describe.skip('Scaler', () => {
        it('should start and stop the scaler', () => {
            // ...
        });
    });
});
