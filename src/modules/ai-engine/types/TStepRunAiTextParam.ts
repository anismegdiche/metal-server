//
//
//
import { TEXT_TASK } from "../consts/TEXT"
import { LANG_ISO } from "../consts/LANG"


//
export type TAiText_top_k = number | null


export type TStepRunAiTextTranslationParams = {
    task: TEXT_TASK.TRANSLATION
    params: {
        src_lang: LANG_ISO
        tgt_lang: LANG_ISO
    }
}

export type TStepRunAiTextSentimentAnalysisParams = {
    task: TEXT_TASK.SENTIMENT_ANALYSIS
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextTextGenerationParams = {
    task: TEXT_TASK.TEXT_GENERATION
    params?: {
        max_length?: number
        do_sample?: boolean
        temperature?: number
    }
}

export type TStepRunAiTextQuestionAnsweringParams = {
    task: TEXT_TASK.QUESTION_ANSWERING
    params: {
        context: string
    }
}

export type TStepRunAiTextSummarizationParams = {
    task: TEXT_TASK.SUMMARIZATION
    params: {
        max_length: number
        min_length: number
    }
}

export type TStepRunAiTextFillMaskParams = {
    task: TEXT_TASK.FILL_MASK
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextZeroShotClassificationParams = {
    task: TEXT_TASK.ZERO_SHOT_CLASSIFICATION
    params: {
        candidate_labels: string[]
    }
}

export type TStepRunAiTextTokenClassificationParams = {
    task: TEXT_TASK.TOKEN_CLASSIFICATION
    params?: {
        grouped_entities?: boolean
    }
}

export type TStepRunAiTextText2TextGenerationParams = {
    task: TEXT_TASK.TEXT2TEXT_GENERATION
}

export type TStepRunAiTextToxicityDetectionParams = {
    task: TEXT_TASK.TOXICITY_DETECTION
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextFeatureExtractionParams = {
    task: TEXT_TASK.FEATURE_EXTRACTION
    params?: {
        return_tensors?: boolean
    }
}

export type TStepRunAiTextKeywordExtractionParams = {
    task: TEXT_TASK.KEYWORD_EXTRACTION
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextLanguageDetectionParams = {
    task: TEXT_TASK.LANGUAGE_DETECTION
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextParaphraseDetectionParams = {
    task: TEXT_TASK.PARAPHRASE_DETECTION
    params: {
        target: string
    }
}

export type TStepRunAiTextSentenceSimilarityParams = {
    task: TEXT_TASK.SENTENCE_SIMILARITY
    params: {
        sentences: string[]
    }
}

export type TStepRunAiTextEmotionDetectionParams = {
    task: TEXT_TASK.EMOTION_DETECTION
    params?: {
        top_k?: TAiText_top_k
    }
}

export type TStepRunAiTextParams = TStepRunAiTextTranslationParams 
    | TStepRunAiTextSentimentAnalysisParams 
    | TStepRunAiTextTextGenerationParams 
    | TStepRunAiTextQuestionAnsweringParams 
    | TStepRunAiTextSummarizationParams 
    | TStepRunAiTextFillMaskParams 
    | TStepRunAiTextZeroShotClassificationParams 
    | TStepRunAiTextTokenClassificationParams 
    | TStepRunAiTextText2TextGenerationParams 
    | TStepRunAiTextToxicityDetectionParams 
    | TStepRunAiTextFeatureExtractionParams 
    | TStepRunAiTextKeywordExtractionParams 
    | TStepRunAiTextLanguageDetectionParams 
    | TStepRunAiTextParaphraseDetectionParams 
    | TStepRunAiTextSentenceSimilarityParams
    | TStepRunAiTextEmotionDetectionParams
