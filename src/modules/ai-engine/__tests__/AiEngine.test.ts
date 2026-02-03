
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AiEngine } from '../AiEngine';
import { ConfigManager } from '../../core/ConfigManager';
import { AI_ENGINE } from '../@consts';

vi.mock('../../core/ConfigManager');
vi.mock('../AiDocker');
vi.mock('../engine/Text', () => ({
    Text: class {
        Clone() { return new (this.constructor as any)(); }
        Init() { return Promise.resolve(); }
    }
}));

describe('AiEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Clear private static factory if possible? 
        // We'll just test the logic.
    });

    describe('BuildAiEnginesList', () => {
        it('should return empty object if no plans', () => {
            vi.mocked(ConfigManager.Has).mockReturnValue(false);
            expect(AiEngine.BuildAiEnginesList()).toEqual({});
        });

        it('should extract ai-tasks from plans', () => {
            vi.mocked(ConfigManager.Has).mockReturnValue(true);
            vi.mocked(ConfigManager.Get).mockReturnValue({
                p1: {
                    e1: [
                        { run: { ai: 'text', task: 't1' } }
                    ]
                }
            });

            const list = AiEngine.BuildAiEnginesList();
            expect(list).toEqual({
                'text-t1': { engine: 'text-t1' }
            });
        });
    });

    describe('GetProvider', () => {
        it('should load and return a provider', async () => {
            const provider = await AiEngine.GetProvider('text-t1');
            expect(provider).toBeDefined();
        });

        it('should throw for invalid provider name', async () => {
            await expect(AiEngine.GetProvider('invalid')).rejects.toThrow();
        });
    });
});
