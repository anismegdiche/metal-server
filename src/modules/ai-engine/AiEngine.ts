//
//
//
import _ from "lodash";
//
import { TJson } from "../../types/TJson";
import { Factory } from "../../utils/Factory";
import { ConfigManager } from "../core/ConfigManager";
import { HttpErrorInternalServerError } from "../errors/HttpErrors";
import { AI_ENGINE } from "./@consts";
import { TConfigAiEngine } from "./@types";
import { AiDocker } from "./AiDocker";
import { IAiEngine } from "./base/IAiEngine";
import { IMAGE_TASK } from "./consts/IMAGE";
import { OCR_TASK } from "./consts/OCR";
import { TEXT_TASK } from "./consts/TEXT";
import { Image } from "./engine/Image";
import { Ocr } from "./engine/Ocr";
import { Text } from "./engine/Text";


//
type PlanStep = { run?: { ai: string; task: string } };
type PlanEntity = PlanStep[];
type Plan = Record<string, PlanEntity[]>;

//
export class AiEngine {

    static readonly #AiEngineFactory = new Factory<IAiEngine>()

    static #AiEnginesConfig: TJson<TConfigAiEngine>
    static AiEnginesInstance: Map<string, IAiEngine> = new Map()

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

    static GetProvider(providerName: string): IAiEngine {
        if (AiEngine.#AiEngineFactory.Has(providerName))
            return AiEngine.#AiEngineFactory.Get(providerName)!.Clone()
        else
            throw new HttpErrorInternalServerError(`AI Engine Provider '${providerName}' not found`)
    }

    static RegisterProviders() {
        // OCR
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.OCR}-${OCR_TASK.IMAGE_TO_STRING}`, new Ocr())
        // TEXT
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.EMOTION_DETECTION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.FILL_MASK}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.KEYWORD_EXTRACTION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.LANGUAGE_DETECTION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.PARAPHRASE_DETECTION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.QUESTION_ANSWERING}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTENCE_SIMILARITY}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.SENTIMENT_ANALYSIS}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.SUMMARIZATION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT2TEXT_GENERATION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.TEXT_GENERATION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.TRANSLATION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.TOKEN_CLASSIFICATION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.TOXICITY_DETECTION}`, new Text())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.TEXT}-${TEXT_TASK.ZERO_SHOT_CLASSIFICATION}`, new Text())       
        // IMAGE
        // AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.DEPTH_ESTIMATION}`, new Image())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_CLASSIFICATION}`, new Image())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_SEGMENTATION}`, new Image())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.IMAGE_TO_TEXT}`, new Image())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.OBJECT_DETECTION}`, new Image())
        AiEngine.#AiEngineFactory.Register(`${AI_ENGINE.IMAGE}-${IMAGE_TASK.VISUAL_QUESTION_ANSWERING}`, new Image()) 
    }

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return

        await AiDocker.Init()

        AiEngine.#AiEnginesConfig = AiEngine.BuildAiEnginesList()
        await AiEngine.CreateAll()

    }

    static async CreateAll() {
        for (const [aiName, aiConfig] of Object.entries(AiEngine.#AiEnginesConfig)) {
            if (!AiEngine.#AiEngineFactory.Has(aiConfig.engine))
                throw new HttpErrorInternalServerError(`AI Engine Provider '${aiConfig.engine}' not found`)

            AiEngine.AiEnginesInstance.set(aiName, AiEngine.GetProvider(aiConfig.engine))
            // eslint-disable-next-line no-await-in-loop
            await AiEngine.AiEnginesInstance.get(aiName)?.Init(aiName, aiConfig)
        }
    }
}