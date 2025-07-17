//
//
//
import { AI_ENGINE } from "./@consts"
import { TUrl } from "../../types/TUrl"
import { TStepRunAiOcrParams } from "./types/TStepRunAiOcrParams"
import { TStepRunAiTextParams } from "./types/TStepRunAiTextParam"


//
export type TConfigAiEngine = {
    engine: AI_ENGINE
    model?: string
    url?: TUrl
}

export type TStepRunAiParams = TStepRunAiOcrParams | TStepRunAiTextParams

export type TAiRunArguments = {
    data: string // Buffer<ArrayBufferLike>
} & TStepRunAiParams

export type TAiRunOutput = void | object | undefined