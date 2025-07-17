
//
//
//
import { Logger } from '../../utils/Logger'
import { ConfigManager } from '../core/ConfigManager'
import { Helper } from '../../utils/Helper'
import { IAiEngine } from './base/IAiEngine'
// AI Engines
import { TesseractJs } from './providers/TesseractJs'
import { TensorFlowJs } from './providers/TensorFlowJs'
import { NlpJs } from './providers/NlpJs'
import { AI_ENGINE } from './@consts'
import { TConfigAiEngineDefault, TConfigAiEngineTesseractJs, TConfigAiEngineTensorFlowJs, TConfigAiEngineNlpJs } from './@types'


//
export class AiEngine {

    static AiEngineConfigurations: Record<string, TConfigAiEngineDefault> = {}
    static AiEngine: Record<string, IAiEngine> = {}

    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    static #NewAiEngineTypeCaseMap: Record<AI_ENGINE, Function> = {
        [AI_ENGINE.TESSERACT_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTesseractJs) => new TesseractJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.TENSORFLOW_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineTensorFlowJs) => new TensorFlowJs(aiEngineInstanceName, AiEngineConfig),
        [AI_ENGINE.NLP_JS]: (aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineNlpJs) => new NlpJs(aiEngineInstanceName, AiEngineConfig)
    }

    @Logger.LogFunction()
    static async Init(): Promise<void> {
        if (!ConfigManager.Has('ai-engines'))
            return

        AiEngine.AiEngineConfigurations = ConfigManager.Get("ai-engines")
        await AiEngine.CreateAll()
    }


    @Logger.LogFunction()
    static async CreateAll(): Promise<void> {
        await Promise.all(
            Object.entries(AiEngine.AiEngineConfigurations).map(async ([aiEngineInstanceName, aiEngineParams]) => {
                await AiEngine.Create(aiEngineInstanceName, aiEngineParams)
            })
        )
    }

    @Logger.LogFunction()
    static async Create(aiEngineInstanceName: string, AiEngineConfig: TConfigAiEngineDefault): Promise<void> {
        if (!(AiEngineConfig.engine in AiEngine.#NewAiEngineTypeCaseMap)) {
            Logger.Error(`Unknown engine type: ${AiEngineConfig.engine}`)
            return
        }
        AiEngine.AiEngine[aiEngineInstanceName] = AiEngine.#NewAiEngineTypeCaseMap[AiEngineConfig.engine](aiEngineInstanceName, AiEngineConfig) ?? Helper.CaseMapNotFound(AiEngineConfig.engine)
        await AiEngine.AiEngine[aiEngineInstanceName].Init()
        Logger.Debug(`${Logger.Out} AI Engine '${aiEngineInstanceName}' created`)
    }

    @Logger.LogFunction()
    static async Run(aiEngineInstanceName: string, input: string) {
        return await AiEngine.AiEngine[aiEngineInstanceName].Run(input)
    }
}
