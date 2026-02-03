
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Plan } from '../Plan';
import { ConfigManager } from '../../core/ConfigManager';
import { DataTable } from '../../../types/DataTable';
import { Step } from '../Step';

vi.mock('../../core/ConfigManager');
vi.mock('../../../utils/Logger', () => ({
    LOGGER_DEFAULT_LEVEL: 'info',
    VERBOSITY: { DEBUG: 'debug' },
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

vi.mock('../../../types/DataBase', async (importOriginal) => {
    const actual = await importOriginal<any>();
    const DataBase = vi.fn(function (this: any) {
        this.Init = vi.fn().mockResolvedValue(undefined);
        this.Tables = {};
        this.SetTable = vi.fn((name, data) => { this.Tables[name] = data; });
    });
    return { ...actual, DataBase };
});

vi.mock('../../../types/DataTable', async (importOriginal) => {
    const actual = await importOriginal<any>();
    const DataTable = vi.fn(function (this: any) {
        this.FreeSql = vi.fn().mockResolvedValue(undefined);
        this.Rename = vi.fn().mockReturnThis();
        this.MetaData = {};
    });
    return { ...actual, DataTable };
});

vi.mock('../Step', () => ({
    Step: {
        ExecuteCaseMap: {}
    }
}));

vi.mock('../../../utils/SynchronizerManager', () => ({
    SynchronizerManager: {
        Synchronized: () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => descriptor
    }
}));

describe('Plan', () => {
    let plan: Plan;

    beforeEach(() => {
        vi.clearAllMocks();
        plan = new Plan('test-plan');
    });

    it('should initialize and load entities', async () => {
        vi.mocked(ConfigManager.Get).mockReturnValue({
            'entity1': [{ step1: {} }]
        });

        await plan.Init();

        expect(plan.Entities.has('entity1')).toBe(true);
        expect(plan._dataBase.Init).toHaveBeenCalled();
    });

    it('should fail ProcessSchemaRequest if entity not found', async () => {
        await expect(plan.ProcessSchemaRequest({ schema: 's', source: 's1', entity: 'missing' } as any))
            .rejects.toThrow();
    });

    describe('ExecuteSteps', () => {
        it('should execute steps in sequence', async () => {
            const steps = {
                '0': { 'mock-cmd': { args: 1 } }
            };
            const mockDataTable = new DataTable() as any;
            (plan._dataBase as any).Tables['e1'] = mockDataTable;

            const executeMock = vi.fn().mockResolvedValue(mockDataTable);
            Step.ExecuteCaseMap['mock-cmd'] = executeMock;

            await plan.ExecuteSteps('s', 'p', 'e1', steps as any);

            expect(executeMock).toHaveBeenCalled();
        });
    });
});
