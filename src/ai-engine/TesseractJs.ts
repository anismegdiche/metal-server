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

export type TTesseractJsEngineParams = {
    engine: string
    model: string
}

export class TesseractJs implements IAiEngine {

    public AiEngineName = "tesseractjs"
    public InstanceName: string
    // OCR lang
    public Model: string

    constructor(aiEngineInstanceName: string, aiEngineParams: TTesseractJsEngineParams) {
        this.InstanceName = aiEngineInstanceName
        this.Model = aiEngineParams.model ?? "eng"
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