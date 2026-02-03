
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ServerResponse } from '../ServerResponse';
import { ServerRuntime } from '../../ServerRuntime';
import { Convert } from '../../../../utils/Convert';
import { RequestHandler } from '../../RequestHandler';

vi.mock('../../ServerRuntime');
vi.mock('../../../../utils/Convert');
vi.mock('../../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
    Logger: {
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        Info: vi.fn(),
        Error: vi.fn(),
        In: '',
        Out: ''
    }
}));
vi.mock('../../RequestHandler');
vi.mock('../../ResponseHandler');

describe('ServerResponse', () => {
    let mockReq: any;
    let mockRes: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockReq = { __METAL_CURRENT_USER: { id: 'user1' } };
        mockRes = {};
    });

    it('should call ServerRuntime.GetInfo in GetInfo', async () => {
        const intRes = { Body: { version: '1.0' } };
        vi.mocked(ServerRuntime.GetInfo).mockResolvedValue(intRes as any);

        await ServerResponse.GetInfo(mockReq as any, mockRes as any);

        expect(ServerRuntime.GetInfo).toHaveBeenCalled();
        expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes);
    });

    it('should call ServerRuntime.Reload in Reload', async () => {
        const intRes = { Body: { message: 'reloaded' } };
        vi.mocked(ServerRuntime.Reload).mockResolvedValue(intRes as any);

        await ServerResponse.Reload(mockReq as any, mockRes as any);

        expect(RequestHandler.CheckRequest).toHaveBeenCalledWith(mockReq);
        expect(ServerRuntime.Reload).toHaveBeenCalledWith(mockReq.__METAL_CURRENT_USER);
        expect(Convert.InternalResponseToResponse).toHaveBeenCalledWith(mockRes, intRes);
    });
});
