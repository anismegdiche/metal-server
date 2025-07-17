//
//
//
import { AI_ENGINE, AI_ENGINE2, NLP_JS_MODEL, TENSORFLOW_JS_MODEL, TESSERACT_JS_MODEL } from "./@consts"
import { TJson } from "../../types/TJson"
import { TUrl } from "../../types/TUrl"
import { TStepRunAiOcrParams } from "./types/TStepRunAiOcrParams"
import { TStepRunAiTextParams } from "./types/TStepRunAiTextParam"


//
export type TConfigAiEngine = {
    engine: AI_ENGINE2
    model?: string
    url: TUrl
}

export type TStepRunAiParams = TStepRunAiOcrParams | TStepRunAiTextParams

export type TAiRunArguments = {
    data: string // Buffer<ArrayBufferLike>
} & TStepRunAiParams

export type TAiRunOutput = void | object | undefined

///////////////////////
///////////////////////
///////////////////////
///////////////////////
///////////////////////
//XXX
export type TConfigAiEngineDefault = {
    engine: AI_ENGINE
    model: string
    options: TJson
}

export type TConfigAiEngineNlpJsSentimentOptions = {
    lang: string
}

export type TConfigAiEngineNlpJsGuessLangOptions = {
    accept: string[] | string
    limit: number | undefined
}

export type TConfigAiEngineNlpJs = TConfigAiEngineDefault & {
    model: NLP_JS_MODEL
    options: TConfigAiEngineNlpJsSentimentOptions | TConfigAiEngineNlpJsGuessLangOptions
}

export type TConfigAiEngineTesseractJs = Partial<TConfigAiEngineDefault> & {
    model: TESSERACT_JS_MODEL
}

export type TConfigAiEngineTensorFlowJsImageClassifyOptions = {
    threshold?: number
}

export type TConfigAiEngineTensorFlowJs = TConfigAiEngineDefault & {
    model: TENSORFLOW_JS_MODEL
    options: TConfigAiEngineTensorFlowJsImageClassifyOptions
}