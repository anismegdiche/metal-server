/**
 * OCR (Optical Character Recognition) related constants
 */

import { LANG_ISO } from "./LANG";

/**
 * Supported languages for OCR processing
 */
export enum OCR_LANG {
    ARA = "ara",
    CHI_SIM = "chi_sim",
    CHI_TRA = "chi_tra",
    DEU = "deu",
    ENG = "eng",
    FRA = "fra",
    ITA = "ita",
    JPN = "jpn",
    KOR = "kor",
    POR = "por",
    RUS = "rus",
    SPA = "spa"
}

export enum OCR_LANG_ISO {
    ARA = LANG_ISO.ar_AR,
    CHI_SIM = LANG_ISO.zh_CN,
    CHI_TRA = "zh_TW",
    DEU = LANG_ISO.de_DE,
    ENG = LANG_ISO.en_XX,
    FRA = LANG_ISO.fr_XX,
    ITA = LANG_ISO.it_IT,
    JPN = LANG_ISO.ja_XX,
    KOR = LANG_ISO.ko_KR,
    POR = LANG_ISO.pt_XX,
    RUS = LANG_ISO.ru_RU,
    SPA = LANG_ISO.es_XX
}

/**
 * Available OCR tasks
 */
export enum OCR_TASK {
    /** Converts image to text */
    IMAGE_TO_STRING = "image-to-string"
}

/**
 * Default parameters for OCR tasks
 */
export const DEFAULT_OCR_PARAMS = {
    [OCR_TASK.IMAGE_TO_STRING]: {}
} as const;
