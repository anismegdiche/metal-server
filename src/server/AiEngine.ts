/* eslint-disable guard-for-in */
//
//
//
//
//
import { Logger } from '../lib/Logger'
import { AI_ENGINE, Config, TConfigAiEngineNlpJs, TConfigAiEngineTensorFlowJs, TConfigAiEngineTesseractJs } from '../server/Config'
import { Helper } from '../lib/Helper'
import { IAiEngine } from '../types/IAiEngine'
import { TConfigAiEngineDefault } from './Config'
// AI Engines
import { TesseractJs } from '../ai-engine/TesseractJs'
import { TensorFlowJs } from '../ai-engine/TensorFlowJs'
import { NlpJs } from '../ai-engine/NlpJs'


export class AiEngine {

    public static AiEngineConfigurations: Record<string, TConfigAiEngineDefault> = {}
    public static AiEngine: Record<string, IAiEngine> = {}

    static #NewAiEngineTypeCaseMap: Record<string, Function> = {
        [AI_ENGINE.TESSERACT_JS]: (aiEngineInstanceName: string, AiEngineParams: TConfigAiEngineTesseractJs) => new TesseractJs(aiEngineInstanceName, AiEngineParams),
        [AI_ENGINE.TENSORFLOW_JS]: (aiEngineInstanceName: string, AiEngineParams: TConfigAiEngineTensorFlowJs) => new TensorFlowJs(aiEngineInstanceName, AiEngineParams),
        [AI_ENGINE.NLP_JS]: (aiEngineInstanceName: string, AiEngineParams: TConfigAiEngineNlpJs) => new NlpJs(aiEngineInstanceName, AiEngineParams)
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

    static async Create(aiEngineInstanceName: string, AiEngineParams: TConfigAiEngineDefault): Promise<void> {
        Logger.Debug(`${Logger.In} Starting '${aiEngineInstanceName}' with params '${JSON.stringify(AiEngineParams)}'`)
        AiEngine.AiEngine[aiEngineInstanceName] = AiEngine.#NewAiEngineTypeCaseMap[AiEngineParams.engine](aiEngineInstanceName, AiEngineParams) || Helper.CaseMapNotFound(AiEngineParams.engine)
        await AiEngine.AiEngine[aiEngineInstanceName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineInstanceName}' created`)
    }

    static async Run(aiEngineInstanceName: string, input: string) {
        return await AiEngine.AiEngine[aiEngineInstanceName].Run(input)
    }
}