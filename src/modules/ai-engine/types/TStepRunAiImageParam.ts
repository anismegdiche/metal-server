//
//
//
import { IMAGE_TASK } from "../consts/IMAGE"


//
export type TStepRunAiImageImageClassificationParams = {
    task: IMAGE_TASK.IMAGE_CLASSIFICATION
    params: undefined
}

export type TStepRunAiImageImageSegmentationParams = {
    task: IMAGE_TASK.IMAGE_SEGMENTATION
    params: undefined
}

export type TStepRunAiImageObjectDetectionParams = {
    task: IMAGE_TASK.OBJECT_DETECTION
    params: undefined
}

export type TStepRunAiImageImageToTextParams = {
    task: IMAGE_TASK.IMAGE_TO_TEXT
    params: undefined
}

export type TStepRunAiImageVisualQuestionAnsweringParams = {
    task: IMAGE_TASK.VISUAL_QUESTION_ANSWERING
    params: {
        question: string
    }
}

export type TStepRunAiImageParams = TStepRunAiImageImageClassificationParams 
    | TStepRunAiImageImageSegmentationParams 
    | TStepRunAiImageObjectDetectionParams 
    | TStepRunAiImageImageToTextParams 
    | TStepRunAiImageVisualQuestionAnsweringParams
