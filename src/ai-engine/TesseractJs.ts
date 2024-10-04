//
//
//
//
//
import { createWorker, Page, RecognizeResult, Worker } from 'tesseract.js'
//
import { Logger } from '../utils/Logger'
import { IAiEngine } from "../types/IAiEngine"
import { AI_ENGINE, TConfigAiEngineTesseractJs } from '../server/AiEngine'


export class TesseractJs implements IAiEngine {

    AiEngineName = AI_ENGINE.TESSERACT_JS
    InstanceName: string
    Model: string                          // OCR lang
    Worker?: Worker

    constructor(aiEngineInstanceName: string, aiEngineConfig: TConfigAiEngineTesseractJs) {
        this.InstanceName = aiEngineInstanceName
        this.Model = aiEngineConfig?.model ?? "eng"
    }


    @Logger.LogFunction()
    async Init(): Promise<void> {
        this.Worker = await createWorker(this.Model)
    }

    @Logger.LogFunction()
    async Run(imagePath: string): Promise<Page | undefined> {
        if (!this.Worker) {
            Logger.Error(`AI '${this.AiEngineName}' is not initialized`)
            return undefined
        }
        return await this.Worker
            .recognize(imagePath)
            // .progress(Logger.Debug)
            .then((result: RecognizeResult) => result.data)
            .catch((error: any) => {
                Logger.Error(`AI '${this.AiEngineName} Error:${error} `)
                return undefined
            })
    }
}