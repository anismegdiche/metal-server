
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Plans } from '../Plans';
import { ConfigManager } from '../../core/ConfigManager';
import { Plan } from '../Plan';

vi.mock('../../core/ConfigManager');
vi.mock('../Plan', () => {
    const Plan = vi.fn(function (this: any) {
        this.Init = vi.fn().mockResolvedValue(undefined);
    });
    return { Plan };
});

describe('Plans', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        Plans.Plans.clear();
    });

    describe('Init', () => {
        it('should create and initialize plans from config', async () => {
            vi.mocked(ConfigManager.Has).mockReturnValue(true);
            vi.mocked(ConfigManager.Get).mockReturnValue({
                'plan1': {},
                'plan2': {}
            });

            await Plans.Init();

            expect(Plan).toHaveBeenCalledTimes(2);
            expect(Plans.Plans.size).toBe(2);
            expect(Plans.Plans.has('plan1')).toBe(true);
            expect(Plans.Plans.has('plan2')).toBe(true);
        });
    });
});
