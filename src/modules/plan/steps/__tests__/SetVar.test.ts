
import { describe, expect, it } from 'vitest';
import type { TContext } from '../../../../modules/sandbox/types/TContext';
import { DataTable } from '../../../../types/DataTable';
import type { TStep } from '../../types/TStep';
import { SetVar, type U_config_plans_plan_entity_set_var_Params } from '../SetVar';

describe('SetVar', () => {
    it('should set variables in context', async () => {
        const mockDataTable = new DataTable();
        const mockContext: Partial<TContext> = {
            $vars: {}
        };
        const step: TStep = {
            currentSchemaName: 's1',
            currentPlanName: 'p1',
            currentDataTable: mockDataTable,
            stepArgs: <U_config_plans_plan_entity_set_var_Params>{
                var1: 'value1',
                var2: '${{ 1 + 1 }}'
            }
        };

        await SetVar(step, mockContext);

        expect(mockContext.$vars).toEqual({
            var1: 'value1',
            var2: 2
        });
    });

    it('should not modify $context and add a new var', async () => {
        const mockDataTable = new DataTable();
        const mockContext: Partial<TContext> = {
            $vars: {
                var1: 'value1',
                var2: 'value2'
            }
        };
        const step: TStep = {
            currentSchemaName: 's1',
            currentPlanName: 'p1',
            currentDataTable: mockDataTable,
            stepArgs: <U_config_plans_plan_entity_set_var_Params>{
                var3: 'value3',
                var4: '${{ 1 + 1 }}'
            }
        };

        await SetVar(step, mockContext);

        expect(mockContext.$vars).toEqual({
            var1: 'value1',
            var2: 'value2',
            var3: 'value3',
            var4: 2
        });
    });

    it('should throw error if wrong argument passed', async () => {
        const step: TStep = {
            currentSchemaName: 's1',
            currentPlanName: 'p1',
            currentDataTable: new DataTable(),
            stepArgs: <U_config_plans_plan_entity_set_var_Params>{ a: 1 }
        };

        await expect(SetVar(step, undefined)).rejects.toThrow('Context is not initialized');
    });

    it('should throw error if context is missing', async () => {
        const step: TStep = {
            currentSchemaName: 's1',
            currentPlanName: 'p1',
            currentDataTable: new DataTable(),
            stepArgs: <U_config_plans_plan_entity_set_var_Params>{ a: 1 }
        };

        await expect(SetVar(step, undefined)).rejects.toThrow('Context is not initialized');
    });
});
