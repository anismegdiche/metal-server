
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Step } from '../Step';
import { DataTable } from '../../../types/DataTable';

vi.mock('../../../utils/Logger', () => ({
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

vi.mock('../../../types/DataTable', async (importOriginal) => {
    const actual = await importOriginal<any>();
    const DataTable = vi.fn(function (this: any) {
        this.Pick = vi.fn().mockReturnThis();
        this.Omit = vi.fn().mockReturnThis();
        this.MetaData = {};
    });
    return { ...actual, DataTable };
});

describe('Step', () => {
    let mockDt: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockDt = new DataTable();
    });

    describe('Pick', () => {
        it('should call DataTable.Pick with arguments', async () => {
            const step = {
                currentDataTable: mockDt,
                stepArgs: ['f1', 'f2']
            };
            await Step.Pick(step as any);
            expect(mockDt.Pick).toHaveBeenCalledWith(['f1', 'f2']);
        });

        it('should return original table if *', async () => {
            const step = {
                currentDataTable: mockDt,
                stepArgs: ['*']
            };
            const result = await Step.Pick(step as any);
            expect(result).toBe(mockDt);
            expect(mockDt.Pick).not.toHaveBeenCalled();
        });
    });

    describe('Omit', () => {
        it('should call DataTable.Omit with arguments', async () => {
            const step = {
                currentDataTable: mockDt,
                stepArgs: ['f1']
            };
            await Step.Omit(step as any);
            expect(mockDt.Omit).toHaveBeenCalledWith(['f1']);
        });
    });
});