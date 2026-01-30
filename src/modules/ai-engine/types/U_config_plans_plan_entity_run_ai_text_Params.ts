//
//
//
import { z } from "zod"
//
import { TEXT_TASK } from "../consts/TEXT"
import { LANG_ISO } from "../consts/LANG"
import { z_T_IntPositive } from "../../../types/T_IntPositive"


//
export const z_TAiText_top_k = z_T_IntPositive.nullable()


export const z_U_config_plans_plan_entity_run_ai_text_translation_Params = z.object({
    task: z.literal(TEXT_TASK.TRANSLATION),
    params: z.object({
        source: z.enum(LANG_ISO),
        target: z.enum(LANG_ISO)
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params = z.object({
    task: z.literal(TEXT_TASK.SENTIMENT_ANALYSIS),
    params: z.object({
        top: z_TAiText_top_k.optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_text_generation_Params = z.object({
    task: z.literal(TEXT_TASK.TEXT_GENERATION),
    params: z.object({
        "max-length": z_T_IntPositive.optional(),
        "do-sample": z.boolean().optional(),
        temperature: z_T_IntPositive.optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_question_answering_Params = z.object({
    task: z.literal(TEXT_TASK.QUESTION_ANSWERING),
    params: z.object({
        question: z.string()
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_summarization_Params = z.object({
    task: z.literal(TEXT_TASK.SUMMARIZATION),
    params: z.object({
        "max-length": z_T_IntPositive,
        "min-length": z_T_IntPositive
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_fill_mask_Params = z.object({
    task: z.literal(TEXT_TASK.FILL_MASK),
    params: z.undefined()
})

export const z_U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params = z.object({
    task: z.literal(TEXT_TASK.ZERO_SHOT_CLASSIFICATION),
    params: z.object({
        labels: z.array(z.string())
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_ner_Params = z.object({
    task: z.literal(TEXT_TASK.NER),
    params: z.object({
        grouped: z.boolean().optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params = z.object({
    task: z.literal(TEXT_TASK.TOXICITY_DETECTION),
    params: z.object({
        top: z_TAiText_top_k.optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_feature_extraction_Params = z.object({
    task: z.literal(TEXT_TASK.FEATURE_EXTRACTION),
    params: z.object({
        return_tensors: z.boolean().optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_keyword_extraction_Params = z.object({
    task: z.literal(TEXT_TASK.KEYWORD_EXTRACTION),
    params: z.undefined()
})

export const z_U_config_plans_plan_entity_run_ai_text_language_detection_Params = z.object({
    task: z.literal(TEXT_TASK.LANGUAGE_DETECTION),
    params: z.undefined()
})

export const z_U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params = z.object({
    task: z.literal(TEXT_TASK.PARAPHRASE_DETECTION),
    params: z.object({
        target: z.string()
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params = z.object({
    task: z.literal(TEXT_TASK.SENTENCE_SIMILARITY),
    params: z.object({
        sentences: z.array(z.string())
    })
})

export const z_U_config_plans_plan_entity_run_ai_text_emotion_detection_Params = z.object({
    task: z.literal(TEXT_TASK.EMOTION_DETECTION),
    params: z.object({
        top: z_TAiText_top_k.optional()
    }).optional()
})

export const z_U_config_plans_plan_entity_run_ai_text_Params = z.discriminatedUnion("task", [
    z_U_config_plans_plan_entity_run_ai_text_translation_Params,
    z_U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params,
    z_U_config_plans_plan_entity_run_ai_text_text_generation_Params,
    z_U_config_plans_plan_entity_run_ai_text_question_answering_Params,
    z_U_config_plans_plan_entity_run_ai_text_summarization_Params,
    z_U_config_plans_plan_entity_run_ai_text_fill_mask_Params,
    z_U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params,
    z_U_config_plans_plan_entity_run_ai_text_ner_Params,
    z_U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params,
    z_U_config_plans_plan_entity_run_ai_text_feature_extraction_Params,
    z_U_config_plans_plan_entity_run_ai_text_keyword_extraction_Params,
    z_U_config_plans_plan_entity_run_ai_text_language_detection_Params,
    z_U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params,
    z_U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params,
    z_U_config_plans_plan_entity_run_ai_text_emotion_detection_Params
])


//
export type TAiText_top_k = z.infer<typeof z_TAiText_top_k>
export type U_config_plans_plan_entity_run_ai_text_translation_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_translation_Params>
export type U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_sentiment_analysis_Params>
export type U_config_plans_plan_entity_run_ai_text_text_generation_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_text_generation_Params>
export type U_config_plans_plan_entity_run_ai_text_question_answering_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_question_answering_Params>
export type U_config_plans_plan_entity_run_ai_text_summarization_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_summarization_Params>
export type U_config_plans_plan_entity_run_ai_text_fill_mask_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_fill_mask_Params>
export type U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_zero_shot_classification_Params>
export type U_config_plans_plan_entity_run_ai_text_ner_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_ner_Params>
export type U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_toxicity_detection_Params>
export type U_config_plans_plan_entity_run_ai_text_feature_extraction_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_feature_extraction_Params>
export type U_config_plans_plan_entity_run_ai_text_keyword_extraction_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_keyword_extraction_Params>
export type U_config_plans_plan_entity_run_ai_text_language_detection_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_language_detection_Params>
export type U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_paraphrase_detection_Params>
export type U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_sentence_similarity_Params>
export type U_config_plans_plan_entity_run_ai_text_emotion_detection_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_emotion_detection_Params>
export type U_config_plans_plan_entity_run_ai_text_Params = z.infer<typeof z_U_config_plans_plan_entity_run_ai_text_Params>
