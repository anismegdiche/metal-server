//
//
//
//
//
import { Logger } from '../utils/Logger'
import { IAiEngine } from "../types/IAiEngine"
//
import { Tesseract } from "tesseract.ts"
import { Page } from 'tesseract.js'
import { AI_ENGINE, TConfigAiEngineTesseractJs } from '../server/AiEngine'

// TODO: tesseract.js@1.0.19: Version contains major bugs and no longer supported. Upgrade to @latest. Guide for upgrading here: https://github.com/naptha/tesseract.js/issues/771
export class TesseractJs implements IAiEngine {

    AiEngineName = AI_ENGINE.TESSERACT_JS
    InstanceName: string
    // OCR lang
    Model: string

    constructor(aiEngineInstanceName: string, aiEngineConfig: TConfigAiEngineTesseractJs) {
        this.InstanceName = aiEngineInstanceName
        this.Model = aiEngineConfig?.model ?? "eng"
    }

     
    @Logger.LogFunction()
    async Init(): Promise<void> {
        return undefined
    }

    @Logger.LogFunction()
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