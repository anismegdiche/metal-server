/* eslint-disable guard-for-in */
//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { TJson } from '../types/TJson'
import { IAiEngine } from '../types/IAiEngine'
// AI Engines
import { TesseractJs } from '../ai-engine/TesseractJs'
import { TensorFlowJs } from '../ai-engine/TensorFlowJs'
import { NlpJs, TNlpJsEngineParams } from '../ai-engine/NlpJs'


export class AiEngine {

    public static EngineConfiguration: Record<string, TJson> = {}
    public static Engine: Record<string, IAiEngine> = {}

    static #NewAiEngine: Record<string, Function> = {
        'tesseractjs': (aiEngineName: string, AiEngineParams: TJson) => new TesseractJs(aiEngineName, AiEngineParams),
        'tensorflowjs': (aiEngineName: string, AiEngineParams: TJson) => new TensorFlowJs(aiEngineName, AiEngineParams),
        'nlpjs': (aiEngineName: string, AiEngineParams: TNlpJsEngineParams) => new NlpJs(aiEngineName, AiEngineParams)
    }

    static async Init(): Promise<void> {
        AiEngine.EngineConfiguration = Config.Get("ai-engines")
    }

    static async CreateAll(): Promise<void> {
        for (const _aiEngineName in AiEngine.EngineConfiguration) {
            const _AiEngineParams = AiEngine.EngineConfiguration[_aiEngineName]
            AiEngine.Create(_aiEngineName, _AiEngineParams)
        }
    }

    static async Create(aiEngineName: string, AiEngineParams: TJson): Promise<void> {
        Logger.Debug(`${Logger.In} Starting '${aiEngineName}' with params '${JSON.stringify(AiEngineParams)}'`)
        const engine = AiEngineParams?.engine as string ?? undefined
        if (!engine) {
            return
        }
        AiEngine.Engine[aiEngineName] = AiEngine.#NewAiEngine[engine](aiEngineName, AiEngineParams)
        await AiEngine.Engine[aiEngineName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineName}' created`)
    }

    static async Run(aiEngineName: string, input: string) {
        return await AiEngine.Engine[aiEngineName].Run(input)
    }
}