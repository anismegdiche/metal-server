//
//
//
import _ from "lodash";
//
import { TJson } from "../../types/TJson";
import { Factory } from "../../utils/Factory";
import { ConfigManager } from "../core/ConfigManager";
import { HttpErrorInternalServerError } from "../errors/HttpErrors";
import { AI_ENGINE2 } from "./@consts";
import { TConfigAiEngine } from "./@types";
import { IAiEngine2 } from "./base/IAiEngine2";
import { OCR_TASK } from "./consts/OCR";
import { TEXT_TASK } from "./consts/TEXT";
import { Ocr } from "./engine/Ocr";
import { Text } from "./engine/Text";
import { AiDocker } from "./stack/AiDocker";


//
type PlanStep = { run?: { ai: string; task: string } };
type PlanEntity = PlanStep[];
type Plan = Record<string, PlanEntity[]>;

//
export class AiEngine2 {

    static readonly #AiEngineFactory = new Factory<IAiEngine2>()

    static #AiEnginesConfig: TJson<TConfigAiEngine>
    static AiEnginesInstance: Map<string, IAiEngine2> = new Map()

    static BuildAiEnginesList(): TJson<TConfigAiEngine> {
        if (!ConfigManager.Has('plans')) {
            return {};
        }

        const plans = ConfigManager.Get("plans") as Plan;

        interface AiTask {
            ai: string;
            task: string;
        }

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
            .filter(Boolean) // Remove nulls
            .uniqWith(_.isEqual) // Remove duplicates using deep comparison
            .value();

        const list = aiTasks.reduce((acc, aiTask) => {
            acc[`${aiTask.ai}-${aiTask.task}`] = {
                engine: `${aiTask.ai}-${aiTask.task}`
            } as TConfigAiEngine
            return acc
        }, {} as TJson<TConfigAiEngine>)
        return list
    }

    static GetProvider(providerName: string): IAiEngine2 {
        if (AiEngine2.#AiEngineFactory.Has(providerName))
            return AiEngine2.#AiEngineFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorInternalServerError(`AI Engine Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        // OCR
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.OCR}-${OCR_TASK.IMAGE_TO_STRING}`, new Ocr())
        // TEXT
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.EMOTION_DETECTION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.FILL_MASK}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.KEYWORD_EXTRACTION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.LANGUAGE_DETECTION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.PARAPHRASE_DETECTION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.QUESTION_ANSWERING}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.SENTENCE_SIMILARITY}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.SENTIMENT_ANALYSIS}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.SUMMARIZATION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.TEXT2TEXT_GENERATION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.TEXT_GENERATION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.TRANSLATION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.TOKEN_CLASSIFICATION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.TOXICITY_DETECTION}`, new Text())
        AiEngine2.#AiEngineFactory.Register(`${AI_ENGINE2.TEXT}-${TEXT_TASK.ZERO_SHOT_CLASSIFICATION}`, new Text())        
    }

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return

        await AiDocker.Init()

        AiEngine2.#AiEnginesConfig = AiEngine2.BuildAiEnginesList()
        await AiEngine2.CreateAll()

    }

    static async CreateAll() {
        for (const [aiName, aiConfig] of Object.entries(AiEngine2.#AiEnginesConfig)) {
            if (!AiEngine2.#AiEngineFactory.Has(aiConfig.engine))
                throw new HttpErrorInternalServerError(`AI Engine Provider '${aiConfig.engine}' not found`)

            AiEngine2.AiEnginesInstance.set(aiName, AiEngine2.GetProvider(aiConfig.engine))
            // eslint-disable-next-line no-await-in-loop
            await AiEngine2.AiEnginesInstance.get(aiName)?.Init(aiName, aiConfig)
        }
    }
}