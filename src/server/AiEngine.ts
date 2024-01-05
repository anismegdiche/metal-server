/* eslint-disable guard-for-in */
//
//
//
//
//
import { Logger } from '../lib/Logger'
import { Config } from '../server/Config'
import { Helper } from '../lib/Helper'
import { IAiEngine } from '../types/IAiEngine'
import { TAiEngineParams } from '../types/TAiEngineParams'
// AI Engines
import { TTesseractJsEngineParams, TesseractJs } from '../ai-engine/TesseractJs'
import { TTensorFlowJsEngineParams, TensorFlowJs } from '../ai-engine/TensorFlowJs'
import { NlpJs, TNlpJsEngineParams } from '../ai-engine/NlpJs'


export class AiEngine {

    public static AiEngineConfigurations: Record<string, TAiEngineParams> = {}
    public static AiEngine: Record<string, IAiEngine> = {}

    static #NewAiEngineTypeCaseMap: Record<string, Function> = {
        'tesseractjs': (aiEngineInstanceName: string, AiEngineParams: TTesseractJsEngineParams) => new TesseractJs(aiEngineInstanceName, AiEngineParams),
        'tensorflowjs': (aiEngineInstanceName: string, AiEngineParams: TTensorFlowJsEngineParams) => new TensorFlowJs(aiEngineInstanceName, AiEngineParams),
        'nlpjs': (aiEngineInstanceName: string, AiEngineParams: TNlpJsEngineParams) => new NlpJs(aiEngineInstanceName, AiEngineParams)
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

    static async Create(aiEngineInstanceName: string, AiEngineParams: TAiEngineParams): Promise<void> {
        Logger.Debug(`${Logger.In} Starting '${aiEngineInstanceName}' with params '${JSON.stringify(AiEngineParams)}'`)
        AiEngine.AiEngine[aiEngineInstanceName] = AiEngine.#NewAiEngineTypeCaseMap[AiEngineParams.engine](aiEngineInstanceName, AiEngineParams) || Helper.CaseMapNotFound(AiEngineParams.engine)
        await AiEngine.AiEngine[aiEngineInstanceName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineInstanceName}' created`)
    }

    static async Run(aiEngineInstanceName: string, input: string) {
        return await AiEngine.AiEngine[aiEngineInstanceName].Run(input)
    }
}