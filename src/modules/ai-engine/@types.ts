//
//
//
import { TUrl } from "../../types/TUrl"
import { AI_ENGINE } from "./@consts"
import { IMAGE_TASK } from "./consts/IMAGE"
import { OCR_TASK } from "./consts/OCR"
import { TEXT_TASK } from "./consts/TEXT"
import { TStepRunAiImageParams } from "./types/TStepRunAiImageParam"
import { TStepRunAiOcrParams } from "./types/TStepRunAiOcrParams"
import { TStepRunAiTextParams } from "./types/TStepRunAiTextParam"


//
export type AI_ENGINE_TASK_MATRIX =
    `${AI_ENGINE.OCR}-${OCR_TASK}`
    | `${AI_ENGINE.TEXT}-${TEXT_TASK}`
    | `${AI_ENGINE.IMAGE}-${IMAGE_TASK}`;

export type TConfigAiEngine = {
    engine: AI_ENGINE_TASK_MATRIX
    model?: string
    url?: TUrl
}

export type TStepRunAiParams = TStepRunAiOcrParams | TStepRunAiTextParams | TStepRunAiImageParams

export type TAiRunArguments = {
    data: string // Buffer<ArrayBufferLike>
} & TStepRunAiParams

export type TAiRunOutput = void | object | undefined