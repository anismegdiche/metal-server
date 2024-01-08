/* eslint-disable guard-for-in */
//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { Helper } from '../lib/Helper'
import { TJson } from '../types/TJson'
import { IAiEngine } from '../types/IAiEngine'
// AI Engines
import { TesseractJs } from '../ai-engine/TesseractJs'
import { TensorFlowJs } from '../ai-engine/TensorFlowJs'
import { NlpJs } from '../ai-engine/NlpJs'

//
//  config types
//
export enum AI_ENGINE {
    NLP_JS = "nlpjs",
    TENSORFLOW_JS = "tensorflowjs",
    TESSERACT_JS = "tesseractjs"
}

// export default AI_ENGINE

export type TConfigAiEngineDefault = {
    engine: AI_ENGINE
    model: string
    options: TJson
}

// nlpjs
export enum NLP_JS_MODEL {
    SENTIMENT = "sentiment",
    GUESS_LANG = "guess-lang"
}

export type TConfigAiEngineNlpJsSentimentOptions = {
    lang: string
}

export type TConfigAiEngineNlpJsGuessLangOptions = {
    accept: string[] | string
    limit: number | undefined
}

export type TConfigAiEngineNlpJs = TConfigAiEngineDefault & {
    model: NLP_JS_MODEL
    options: TConfigAiEngineNlpJsSentimentOptions | TConfigAiEngineNlpJsGuessLangOptions
}

// tesseractjs
export type TConfigAiEngineTesseractJs = Partial<TConfigAiEngineDefault> & {
    model: string
}

// tensorflowjs
export enum TENSORFLOW_JS_MODEL {
    IMAGE_CLASSIFY = "image-classify"
}

export type TConfigAiEngineTensorFlowJsImageClassifyOptions = {
    threshold?: number
}

export type TConfigAiEngineTensorFlowJs = TConfigAiEngineDefault & {
    model: TENSORFLOW_JS_MODEL
    options: TConfigAiEngineTensorFlowJsImageClassifyOptions
}
//
//
//
export class AiEngine {

    static AiEngineConfigurations: Record<string, TConfigAiEngineDefault> = {}
    static AiEngine: Record<string, IAiEngine> = {}

    static #NewAiEngineTypeCaseMap: Record<AI_ENGINE, Function> = {
        [AI_ENGINE.TESSERACT_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTesseractJs) => new TesseractJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.TENSORFLOW_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTensorFlowJs) => new TensorFlowJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.NLP_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineNlpJs) => new NlpJs(aiEngineInstanceName, AiEngineConfig)
    }

    static async Init(): Promise<void> {
        AiEngine.AiEngineConfigurations = Config.Get("ai-engines")
    }

    static async CreateAll(): Promise<void> {
        await Promise.all(
            Object.entries(AiEngine.AiEngineConfigurations).map(async ([aiEngineInstanceName, aiEngineParams]) => {
                await AiEngine.Create(aiEngineInstanceName, aiEngineParams)
            })
        )
    }

    static async Create(aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineDefault): Promise<void> {
        Logger.Debug(`${Logger.In} Starting '${aiEngineInstanceName}' with params '${JSON.stringify(AiEngineConfig)}'`)
        if (!(AiEngineConfig.engine in AiEngine.#NewAiEngineTypeCaseMap)) {
            Logger.Error(`Unknown engine type: ${AiEngineConfig.engine}`)
            return
        }
        AiEngine.AiEngine[aiEngineInstanceName] = AiEngine.#NewAiEngineTypeCaseMap[AiEngineConfig.engine](aiEngineInstanceName, AiEngineConfig) || Helper.CaseMapNotFound(AiEngineConfig.engine)
        await AiEngine.AiEngine[aiEngineInstanceName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineInstanceName}' created`)
    }

    static async Run(aiEngineInstanceName: string, input: string) {
        return await AiEngine.AiEngine[aiEngineInstanceName].Run(input)
    }
}
