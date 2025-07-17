//
//
//
import { OCR_TASK, OCR_LANG_ISO } from "../consts/OCR";


//
export type TStepRunAiOcrParams = {
    task: OCR_TASK;
    params?: {
        lang: OCR_LANG_ISO;
    };
};
