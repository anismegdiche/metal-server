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
import { AI_ENGINE, TConfigAiEngineTesseractJs } from '../server/Config'

export class TesseractJs implements IAiEngine {

    public AiEngineName = AI_ENGINE.TESSERACT_JS
    public InstanceName: string
    // OCR lang
    public Model: string

    constructor(aiEngineInstanceName: string, aiEngineConfig: TConfigAiEngineTesseractJs) {
        this.InstanceName = aiEngineInstanceName
        this.Model = aiEngineConfig?.model ?? "eng"
    }

    // eslint-disable-next-line class-methods-use-this
    async Init(): Promise<void> {
        return undefined
    }

    async Run(imagePath: string): Promise<Page | undefined> {
        return Tesseract
            .recognize(imagePath, this.Model)
            .progress(Logger.Debug)
            .then(_result => {
                Logger.Debug(_result)
                return _result
            })
            .catch(_error => {
                Logger.Error(_error)
                return undefined
            })
    }
}