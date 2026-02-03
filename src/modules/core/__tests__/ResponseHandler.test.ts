
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ResponseHandler } from '../ResponseHandler';
import { Schema } from '../../schema/Schema';

vi.mock('../ConfigManager');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
    Logger: {
        Debug: vi.fn(),
        Error: vi.fn(),
        LogFunction: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor,
        In: '',
        Out: ''
    }
}));
vi.mock('../../schema/Schema');
vi.mock('../errors/HttpErrors');

describe('ResponseHandler', () => {
    let mockRes: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRes = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn().mockReturnThis(),
            end: vi.fn().mockReturnThis()
        };
    });

    describe('SetContentJson', () => {
        it('should set Content-Type header', () => {
            const next = vi.fn();
            ResponseHandler.SetContentJson({} as any, mockRes as any, next);
            expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json; charset=utf-8');
            expect(next).toHaveBeenCalled();
        });
    });

    describe('ResponseError', () => {
        it('should return error with message', () => {
            const error = new Error('test-error');
            ResponseHandler.ResponseError(mockRes as any, error);
            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'test-error' }));
        });
    });

    describe('FromSchemaResponse', () => {
        it('should return basic json if no data', async () => {
            const schemaRes = {
                schema: 's',
                entity: 'e',
                status: 200,
                data: { Count: vi.fn().mockResolvedValue(0) }
            };
            vi.mocked(Schema.IsSchemaResponse).mockReturnValue(true);

            await ResponseHandler.FromSchemaResponse(schemaRes as any, mockRes as any);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ schema: 's', entity: 'e', status: 200 });
        });
    });
});
