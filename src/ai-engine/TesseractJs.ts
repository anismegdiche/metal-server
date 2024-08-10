//
//
//
//
//
import { Logger } from '../lib/Logger'
import { IAiEngine } from "../types/IAiEngine"
//
import { Tesseract } from "tesseract.ts"
import { Page } from 'tesseract.js'
import { AI_ENGINE, TConfigAiEngineTesseractJs } from '../server/AiEngine'

export class TesseractJs implements IAiEngine {

    AiEngineName = AI_ENGINE.TESSERACT_JS
    InstanceName: string
    // OCR lang
    Model: string

    constructor(aiEngineInstanceName: string, aiEngineConfig: TConfigAiEngineTesseractJs) {
        this.InstanceName = aiEngineInstanceName
        this.Model = aiEngineConfig?.model ?? "eng"
    }

     
    async Init(): Promise<void> {
        return undefined
    }

    async Run(imagePath: string): Promise<Page | undefined> {
        return Tesseract
            .recognize(imagePath, this.Model)
            .progress(Logger.Debug)
            .then(_result => {
                return _result
            })
            .catch(_error => {
                Logger.Error(_error)
                return undefined
            })
    }
}