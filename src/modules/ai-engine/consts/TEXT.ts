/**
 * Text processing pipelines extracted from ai-docker.rest
 * These represent the available text processing endpoints
 */

import { LANG_ISO } from "./LANG";

export enum TEXT_LANGUAGE_DETECTION {
    ar = "ar",
    bg = "bg",
    de = "de",
    el = "el",
    en = "en",
    es = "es",
    fr = "fr",
    hi = "hi",
    it = "it",
    ja = "ja",
    nl = "nl",
    pl = "pl",
    pt = "pt",
    ru = "ru",
    sw = "sw",
    th = "th",
    tr = "tr",
    ur = "ur",
    vi = "vi",
    zh = "zh"
}

export enum TEXT_LANGUAGE_DETECTION_ISO {
    ar = LANG_ISO.ar_AR,
    bg = "bg_BG",
    de = LANG_ISO.de_DE,
    el = "el_GR",
    en = LANG_ISO.en_XX,
    es = LANG_ISO.es_XX,
    fr = LANG_ISO.fr_XX,
    hi = LANG_ISO.hi_IN,
    it = LANG_ISO.it_IT,
    ja = LANG_ISO.ja_XX,
    nl = LANG_ISO.nl_XX,
    pl = LANG_ISO.pl_PL,
    pt = LANG_ISO.pt_XX,
    ru = LANG_ISO.ru_RU,
    sw = LANG_ISO.sw_KE,
    th = LANG_ISO.th_TH,
    tr = LANG_ISO.tr_TR,
    ur = LANG_ISO.ur_PK,
    vi = LANG_ISO.vi_VN,
    zh = LANG_ISO.zh_CN
}

/**
 * Available text processing tasks
 */
export enum TEXT_TASK {

    /** Emotion detection */
    EMOTION_DETECTION = "emotion-detection",

    /** Feature extraction */
    FEATURE_EXTRACTION = "feature-extraction",

    /** Fill in the blank/masked language modeling */
    FILL_MASK = "fill-mask",

    /** Keyword extraction */
    KEYWORD_EXTRACTION = "keyword-extraction",

    /** Language detection */
    LANGUAGE_DETECTION = "language-detection",

    /** Paraphrase detection */
    PARAPHRASE_DETECTION = "paraphrase-detection",

    /** Question answering */
    QUESTION_ANSWERING = "question-answering",

    /** Sentence similarity */
    SENTENCE_SIMILARITY = "sentence-similarity",

    /** Sentiment analysis of text */
    SENTIMENT_ANALYSIS = "sentiment-analysis",

    /** Text summarization */
    SUMMARIZATION = "summarization",

    /** Text-to-text generation */
    TEXT2TEXT_GENERATION = "text2text-generation",

    /** Text generation */
    TEXT_GENERATION = "text-generation",

    /** Token classification (e.g., NER) */
    TOKEN_CLASSIFICATION = "token-classification",

    /** Toxicity detection */
    TOXICITY_DETECTION = "toxicity-detection",

    /** Text translation */
    TRANSLATION = "translation",

    /** Zero-shot classification */
    ZERO_SHOT_CLASSIFICATION = "zero-shot-classification"
}

/**
 * Default parameters for each text processing task
 */
// export const DEFAULT_TEXT_TASK_PARAMS = {
//     [TEXT_TASK.SENTIMENT_ANALYSIS]: {
//         top_k: null
//     },
//     [TEXT_TASK.TEXT_GENERATION]: {
//         max_length: 50,
//         do_sample: true,
//         temperature: 0.9
//     },
//     [TEXT_TASK.QUESTION_ANSWERING]: {},
//     [TEXT_TASK.SUMMARIZATION]: {
//         max_length: 20,
//         min_length: 10
//     },
//     [TEXT_TASK.FILL_MASK]: {
//         top_k: 1
//     },
//     [TEXT_TASK.TRANSLATION]: {
//         src_lang: LANG_ISO.en_XX,
//         tgt_lang: LANG_ISO.fr_XX
//     },
//     [TEXT_TASK.ZERO_SHOT_CLASSIFICATION]: {
//         candidate_labels: ["support"]
//     },
//     [TEXT_TASK.TOKEN_CLASSIFICATION]: {
//         grouped_entities: true
//     },
//     [TEXT_TASK.TEXT2TEXT_GENERATION]: {}
// } as const;
