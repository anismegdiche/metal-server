/* eslint-disable @typescript-eslint/no-explicit-any */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigManager } from '../../core/ConfigManager';
import { AI_ENGINE } from '../@consts';
import { AiEngine } from '../AiEngine';
import { IMAGE_TASK } from '../consts/IMAGE';
import { TEXT_TASK } from '../consts/TEXT';

describe('AiEngine', () => {
    describe('BuildAiEnginesList', () => {
        beforeEach(() => {
            vi.resetAllMocks();
        });

        it('should return empty object if no plans are configured', () => {
            vi.spyOn(ConfigManager, 'Has').mockReturnValue(false);

            const result = AiEngine.BuildAiEnginesList();

            expect(result).toEqual({});
        });

        it('should correctly build engine list from complex plans', () => {
            const mockPlans = {
                plan1: [
                    [
                        { run: { ai: [AI_ENGINE.TEXT], task: TEXT_TASK.TRANSLATION } },
                        { run: { ai: [AI_ENGINE.IMAGE], task: IMAGE_TASK.IMAGE_TO_TEXT } },
                        { somethingElse: {} } as any
                    ],
                    [
                        { run: { ai: [AI_ENGINE.TEXT], task: TEXT_TASK.SUMMARIZE } },
                        { somethingElse: {} } as any,
                        { somethingElse: {} } as any,
                    ]
                ],
                plan2: [
                    [
                        { run: { ai: [AI_ENGINE.TEXT], task: TEXT_TASK.TRANSLATION } }, // Duplicate across plans
                        { somethingElse: {} } as any
                    ]
                ]
            };

            vi.spyOn(ConfigManager, 'Has').mockReturnValue(true);
            vi.spyOn(ConfigManager, 'Get').mockReturnValue(mockPlans);

            const result = AiEngine.BuildAiEnginesList();

            expect(result).toEqual({
                [`${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}`]: { engine: `${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}` },
                [`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_TO_TEXT}`]: { engine: `${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_TO_TEXT}` },
                [`${AI_ENGINE.TEXT}-${TEXT_TASK.SUMMARIZE}`]: { engine: `${AI_ENGINE.TEXT}-${TEXT_TASK.SUMMARIZE}` }
            });
            // Check uniqueness - '${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}' should appear only once in keys
            expect(Object.keys(result)).toHaveLength(3);
        });

        it('should handle plans with no run steps', () => {
            const mockPlans = {
                plan1: [
                    [
                        { other: 'stuff' } as any
                    ]
                ]
            };

            vi.spyOn(ConfigManager, 'Has').mockReturnValue(true);
            vi.spyOn(ConfigManager, 'Get').mockReturnValue(mockPlans);

            const result = AiEngine.BuildAiEnginesList();

            expect(result).toEqual({});
        });

        it('should handle plans with empty entities', () => {
            const mockPlans = {
                plan1: []
            };

            vi.spyOn(ConfigManager, 'Has').mockReturnValue(true);
            vi.spyOn(ConfigManager, 'Get').mockReturnValue(mockPlans);

            const result = AiEngine.BuildAiEnginesList();

            expect(result).toEqual({});
        });
    });
});
