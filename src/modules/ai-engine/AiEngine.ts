 
//
//
//
import _ from "lodash";
//
import { TJson } from "../../types/TJson";
import { Factory } from "../../utils/Factory";
import { ConfigManager } from "../core/ConfigManager";
import { HttpErrorInternalServerError, HttpErrorNotFound } from "../errors/HttpErrors";
import { AI_ENGINE } from "./@consts";
import { TConfigAiEngine } from "./@types";
import { AiDocker } from "./AiDocker";
import { IAiEngine } from "./base/IAiEngine";


//
type PlanStep = { run?: { ai: string; task: string } };
type PlanEntity = PlanStep[];
type Plan = Record<string, PlanEntity[]>;

type AiTask = {
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
    static readonly #aiEngineFactory = new Factory<IAiEngine>();
    static readonly #loadingPromises = new Map<string, Promise<IAiEngine>>();
    
    static #aiEnginesConfig: TJson<TConfigAiEngine> = {};
    static AiEnginesInstance: Map<string, IAiEngine> = new Map();

    /**
     * Build a list of AI engines from the configuration
     */
    static BuildAiEnginesList(): TJson<TConfigAiEngine> {
        if (!ConfigManager.Has('plans')) {
            return {};
        }

        const plans = ConfigManager.Get<Plan>("plans");

        const aiTasks = _(Object.values(plans))
            .flatMap(plan => _
                .flatMap(plan, entity => entity
                    .map(step => step.run)
                    .filter((run): run is NonNullable<typeof run> => Boolean(run))
                    .map(({ ai, task }): AiTask => ({
                        ai,
                        task
                    }))
                ))
            .filter(Boolean)
            .uniqWith(_.isEqual)
            .value();

        return aiTasks.reduce((acc, { ai, task }) => {
            acc[`${ai}-${task}`] = { engine: `${ai}-${task}` } as TConfigAiEngine;
            return acc;
        }, {} as TJson<TConfigAiEngine>);
    }

    /**
     * Get an AI engine provider by name
     * @param providerName Name of the provider in format "engineType-task"
     */
    static async GetProvider(providerName: string): Promise<IAiEngine> {
        // If already loaded, return from factory
        if (AiEngine.#aiEngineFactory.Has(providerName)) {
            return AiEngine.#aiEngineFactory.Get(providerName)!.Clone();
        }

        // If already loading, return the existing promise
        const existingPromise = AiEngine.#loadingPromises.get(providerName);
        if (existingPromise) {
            return existingPromise.then(provider => provider.Clone());
        }

        // Parse the provider name to get engine type and task
        const [engineType, task] = providerName.split('-');
        if (!engineType || !task) {
            throw new HttpErrorNotFound(`Invalid AI engine provider name: ${providerName}`);
        }

        // Get the loader for this engine type
        const engineLoader = engineLoaders[engineType];
        if (!engineLoader) {
            throw new HttpErrorNotFound(`AI Engine type '${engineType}' not found`);
        }

        // Create a loading promise
        const loadPromise = (async () => {
            try {
                const EngineClass = await engineLoader();
                const engine = new EngineClass();
                AiEngine.#aiEngineFactory.Register(providerName, engine);
                return engine;
            } finally {
                AiEngine.#loadingPromises.delete(providerName);
            }
        })();

        // Store the loading promise to prevent duplicate loads
        AiEngine.#loadingPromises.set(providerName, loadPromise);
        const engine = await loadPromise;
        return engine.Clone();
    }

    static async Init() {
        if (!ConfigManager.Has('plans')) {
            return;
        }

        await AiDocker.Init();
        AiEngine.#aiEnginesConfig = AiEngine.BuildAiEnginesList();
        AiEngine.CreateAll()
    }

    /**
     * Create and initialize all AI engine instances from the configuration
     */
    static async CreateAll() {
        const entries = Object.entries(AiEngine.#aiEnginesConfig);
        
        // Process all providers in parallel
        const results = await Promise.allSettled(
            entries.map(async ([aiName, aiConfig]) => {
                try {
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
                }
            })
        );

        // Check for any failures
        const failures = results
            .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
            .map((result, index) => ({
                aiName: entries[index]?.[0] || 'unknown',
                error: result.reason instanceof Error 
                    ? result.reason.message 
                    : String(result.reason)
            }));

        if (failures.length > 0) {
            const errorDetails = failures
                .map(({ aiName, error }) => `- ${aiName}: ${error}`)
                .join('\n');
            const errorMessage = `Failed to initialize ${failures.length} AI engine(s):\n${errorDetails}`;
            throw new HttpErrorInternalServerError(errorMessage);
        }
    }
}