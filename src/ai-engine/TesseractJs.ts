//
//
//
//
//
import { Tesseract } from "tesseract.ts"
import { Logger } from '../lib/Logger'
import { IAiEngine } from "../types/IAiEngine"
import { Page } from 'tesseract.js'
import { TJson } from "../types/TJson"

export class TesseractJs implements IAiEngine {

    public EngineName = "tesseractjs"
    public Name: string
    public Options: TJson

    constructor(aiName: string, aiParams: TJson) {
        this.Name = aiName
        this.Options = {
            Lang: (aiParams?.model ?? undefined) as string | undefined
        }
    }

    // eslint-disable-next-line class-methods-use-this
    async Init(): Promise<void> {
        Logger.Debug(`TesseractJs: Init ${JSON.stringify(this.Options)}`)
    }

    async Run(image: string): Promise<Page | undefined> {
        try {
            const result = Tesseract
                .recognize(
                    image,
                    this.Options.Lang
                )
                .progress(Logger.Debug)
            Logger.Debug(result)
            return result
        } catch (error) {
            Logger.Error(error)
            return undefined
        }
    }
}