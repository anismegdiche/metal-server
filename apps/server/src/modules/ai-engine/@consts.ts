//
//
//
import { AiEnginesGetModelsPath } from "@metal/config"


//
export enum AI_ENGINE {
	OCR = "ocr",
	TEXT = "text",
	IMAGE = "image",
	AUDIO = "audio",
	DOCUMENT = "document",
}


//
export const AI_DOCKER_MODEL_PATH = AiEnginesGetModelsPath()
