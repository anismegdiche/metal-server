
//
//
//
import * as _ from 'lodash-es';
//
import type { TJson } from "../../types/TJson";
import { Factory } from "../../utils/Factory";
import { Semaphore } from "../../utils/Semaphore";
import { ConfigManager } from "../core/ConfigManager";
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../errors/HttpErrors";
import { STEP } from '../plan/@consts';
import type { U_config_plans } from '../plan/types/U_config_plans';
import type { U_config_plans_plan_entity_run_Params } from '../plan/types/U_config_plans_plan_entity_step';
import { AI_ENGINE } from "./@consts";
import { AiDocker } from "./AiDocker";
import type { IAiEngine } from "./base/IAiEngine";
import { BaseImageDockerService, BaseTextDockerService } from "./docker-services/BaseDockerService";
import type { T_config_ai_engines_ai_engine } from "./types/T_config_ai_engines_ai_engine";


//
type TPlanStep = { [STEP.RUN]: U_config_plans_plan_entity_run_Params };
type TPlanEntity = TPlanStep[];
type TAiTask = {
    ai: string;
    task: string;
};

type ProviderLoader = () => Promise<{ new(): IAiEngine }>;

// Map of AI engine types to their module loaders
const engineLoaders: Record<string, ProviderLoader> = {
    [AI_ENGINE.OCR]: () => import('./engine/Ocr').then(m => m.Ocr),
    [AI_ENGINE.TEXT]: () => import('./engine/Text').then(m => m.Text),
    [AI_ENGINE.IMAGE]: () => import('./engine/Image').then(m => m.Image),
    [AI_ENGINE.AUDIO]: () => import('./engine/Audio').then(m => m.Audio)
};

export class AiEngine {
    static readonly _aiEngineFactory = new Factory<IAiEngine>();
    static readonly _loadingPromises = new Map<string, Promise<IAiEngine>>();
    static _aiEnginesConfig: TJson<T_config_ai_engines_ai_engine> = {};
    static AiEnginesInstance: Map<string, IAiEngine> = new Map();

    // Build a list of AI engines from the configuration
    static BuildAiEnginesList(): TJson<T_config_ai_engines_ai_engine> {
        if (!ConfigManager.Has('plans')) {
            return {};
        }

        const plans = ConfigManager.Get<U_config_plans>("plans");

        const aiTasks = _.chain(plans)
            .flatMap((plan: TPlanEntity[]) => _.flatMap(plan, (entity: TPlanEntity) => entity
                .map((step: TPlanStep) => step.run)
                .filter((run): run is NonNullable<typeof run> => Boolean(run))
                .map(({ ai, task }): TAiTask => ({
                    ai,
                    task
                }))
            ))
            .filter(Boolean)
            .uniqWith(_.isEqual)
            .value() as unknown as TAiTask[];

        return aiTasks.reduce((acc: TJson<T_config_ai_engines_ai_engine>, { ai, task }: TAiTask) => {
            acc[`${ai}-${task}`] = { engine: `${ai}-${task}` } as T_config_ai_engines_ai_engine;
            return acc;
        }, {} as TJson<T_config_ai_engines_ai_engine>);
    }

    /**
     * Get an AI engine provider by name
     * @param providerName Name of the provider in format "engineType-task"
     */
    static async GetProvider(providerName: string): Promise<IAiEngine> {
        // If already loaded, return from factory
        if (AiEngine._aiEngineFactory.Has(providerName)) {
            return AiEngine._aiEngineFactory.Get(providerName)!.Clone();
        }

        // If already loading, return the existing promise
        const existingPromise = AiEngine._loadingPromises.get(providerName);
        if (existingPromise) {
            return existingPromise.then(provider => provider.Clone());
        }

        // Parse the provider name to get engine type and task
        const [engineType, task] = providerName.split('-');
        if (!engineType || !task) {
            throw new HttpErrorNotFound(`Invalid AI engine provider name: ${providerName}`);
        }

        // Get the loader for this engine type
        if (!Object.prototype.hasOwnProperty.call(engineLoaders, engineType)) {
            throw new HttpErrorNotFound(`AI Engine type '${engineType}' not found`);
        }
        const engineLoader = engineLoaders[engineType]!;
        if (!engineLoader) {
            throw new HttpErrorNotFound(`AI Engine type '${engineType}' not found`);
        }

        // Create a loading promise
        const loadPromise = (async () => {
            try {
                const EngineClass = await engineLoader();
                const engine = new EngineClass();
                AiEngine._aiEngineFactory.Register(providerName, engine);
                return engine;
            } finally {
                AiEngine._loadingPromises.delete(providerName);
            }
        })();

        // Store the loading promise to prevent duplicate loads
        AiEngine._loadingPromises.set(providerName, loadPromise);
        const engine = await loadPromise;
        return engine.Clone();
    }

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return;

        if (Object.keys(AiEngine.BuildAiEnginesList()).length == 0)
            return;

        await AiDocker.Init();
        AiEngine._aiEnginesConfig = AiEngine.BuildAiEnginesList();

        if (Object.keys(AiEngine._aiEnginesConfig).some(key => key.startsWith(AI_ENGINE.TEXT)))
            await AiDocker.BuildServiceImage(BaseTextDockerService);

        if (Object.keys(AiEngine._aiEnginesConfig).some(key => key.startsWith(AI_ENGINE.IMAGE)))
            await AiDocker.BuildServiceImage(BaseImageDockerService);

        AiEngine.CreateAll()
    }

    /**
     * Create and initialize all AI engine instances from the configuration
     */
    static async CreateAll() {
        const entries = Object.entries(AiEngine._aiEnginesConfig);

        const buildBatchSize = ConfigManager.Get<number>("server.ai-engines.build-batch-size");

        const __LOCK__ = new Semaphore(buildBatchSize);

        // Process all providers in parallel
        const results = await Promise.all(
            entries.map(async ([aiName, aiConfig]) => {
                try {
                    await __LOCK__.Acquire();
                    // Get the provider asynchronously (will load it if not already loaded)
                    const provider = await AiEngine.GetProvider(aiConfig.engine);

                    // Store the instance and initialize it
                    AiEngine.AiEnginesInstance.set(aiName, provider);
                    await provider.Init(aiName, aiConfig);
                    return {
                        aiName,
                        success: true
                    };
                } catch (error) {
                    return {
                        aiName,
                        success: false,
                        error: error instanceof Error
                            ? error.message
                            : String(error)
                    };
                } finally {
                    __LOCK__.Release();
                }
            })
        );

        // Check for any failures
        const failures = results.filter((r): r is { aiName: string; success: false; error: string } => !r.success);

        if (failures.length > 0) {
            const errorDetails = failures
                .map(({ aiName, error }) => `- ${aiName}: ${error}`)
                .join('\n');
            const errorMessage = `Failed to initialize ${failures.length} AI engine(s):\n${errorDetails}`;
            throw new HttpErrorInternalServerError(errorMessage);
        }
    }
}