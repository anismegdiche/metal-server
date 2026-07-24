//
//
//
import { z } from "zod"
import { z_T_IntPositive } from "@metal/types"
import { LANG_ISO } from "../consts/LANG"
//
import { TEXT_TASK } from "../consts/TEXT"

//
export const z_T_AiText_param_top = z_T_IntPositive.nullable()

export const z_U__plans_plan_run_ai_text_translation_Params = z.object({
	task: z.literal(TEXT_TASK.TRANSLATION),
	params: z.object({
		source: z.enum(LANG_ISO),
		target: z.enum(LANG_ISO),
	}),
})

export const z_U__plans_plan_run_ai_text_sentiment_analysis_Params = z.object({
	task: z.literal(TEXT_TASK.SENTIMENT_ANALYSIS),
	params: z
		.object({
			top: z_T_AiText_param_top.optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_text_generation_Params = z.object({
	task: z.literal(TEXT_TASK.TEXT_GENERATION),
	params: z
		.object({
			"max-length": z_T_IntPositive.optional(),
			"do-sample": z.boolean().optional(),
			temperature: z.number().gt(0).max(2).optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_question_answering_Params = z.object({
	task: z.literal(TEXT_TASK.QUESTION_ANSWERING),
	params: z.object({
		question: z.string(),
	}),
})

export const z_U__plans_plan_run_ai_text_summarization_Params = z.object({
	task: z.literal(TEXT_TASK.SUMMARIZATION),
	params: z.object({
		"max-length": z_T_IntPositive,
		"min-length": z_T_IntPositive,
	}),
})

export const z_U__plans_plan_run_ai_text_fill_mask_Params = z.object({
	task: z.literal(TEXT_TASK.FILL_MASK),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_text_zero_shot_classification_Params = z.object({
	task: z.literal(TEXT_TASK.ZERO_SHOT_CLASSIFICATION),
	params: z.object({
		labels: z.array(z.string()),
	}),
})

export const z_U__plans_plan_run_ai_text_ner_Params = z.object({
	task: z.literal(TEXT_TASK.NER),
	params: z
		.object({
			grouped: z.boolean().optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_toxicity_detection_Params = z.object({
	task: z.literal(TEXT_TASK.TOXICITY_DETECTION),
	params: z
		.object({
			top: z_T_AiText_param_top.optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_feature_extraction_Params = z.object({
	task: z.literal(TEXT_TASK.FEATURE_EXTRACTION),
	params: z
		.object({
			return_tensors: z.boolean().optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_keyword_extraction_Params = z.object({
	task: z.literal(TEXT_TASK.KEYWORD_EXTRACTION),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_text_language_detection_Params = z.object({
	task: z.literal(TEXT_TASK.LANGUAGE_DETECTION),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_text_paraphrase_detection_Params = z.object({
	task: z.literal(TEXT_TASK.PARAPHRASE_DETECTION),
	params: z.object({
		target: z.string(),
	}),
})

export const z_U__plans_plan_run_ai_text_sentence_similarity_Params = z.object({
	task: z.literal(TEXT_TASK.SENTENCE_SIMILARITY),
	params: z.object({
		sentences: z.array(z.string()),
	}),
})

export const z_U__plans_plan_run_ai_text_emotion_detection_Params = z.object({
	task: z.literal(TEXT_TASK.EMOTION_DETECTION),
	params: z
		.object({
			top: z_T_AiText_param_top.optional(),
		})
		.optional(),
})

export const z_U__plans_plan_run_ai_text_Params = z.discriminatedUnion("task", [
	z_U__plans_plan_run_ai_text_translation_Params,
	z_U__plans_plan_run_ai_text_sentiment_analysis_Params,
	z_U__plans_plan_run_ai_text_text_generation_Params,
	z_U__plans_plan_run_ai_text_question_answering_Params,
	z_U__plans_plan_run_ai_text_summarization_Params,
	z_U__plans_plan_run_ai_text_fill_mask_Params,
	z_U__plans_plan_run_ai_text_zero_shot_classification_Params,
	z_U__plans_plan_run_ai_text_ner_Params,
	z_U__plans_plan_run_ai_text_toxicity_detection_Params,
	z_U__plans_plan_run_ai_text_feature_extraction_Params,
	z_U__plans_plan_run_ai_text_keyword_extraction_Params,
	z_U__plans_plan_run_ai_text_language_detection_Params,
	z_U__plans_plan_run_ai_text_paraphrase_detection_Params,
	z_U__plans_plan_run_ai_text_sentence_similarity_Params,
	z_U__plans_plan_run_ai_text_emotion_detection_Params,
])

//
export type T_AiText_param_top = z.infer<typeof z_T_AiText_param_top>
export type U__plans_plan_run_ai_text_translation_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_translation_Params
>
export type U__plans_plan_run_ai_text_sentiment_analysis_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_sentiment_analysis_Params
>
export type U__plans_plan_run_ai_text_text_generation_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_text_generation_Params
>
export type U__plans_plan_run_ai_text_question_answering_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_question_answering_Params
>
export type U__plans_plan_run_ai_text_summarization_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_summarization_Params
>
export type U__plans_plan_run_ai_text_fill_mask_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_fill_mask_Params
>
export type U__plans_plan_run_ai_text_zero_shot_classification_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_zero_shot_classification_Params
>
export type U__plans_plan_run_ai_text_ner_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_ner_Params
>
export type U__plans_plan_run_ai_text_toxicity_detection_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_toxicity_detection_Params
>
export type U__plans_plan_run_ai_text_feature_extraction_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_feature_extraction_Params
>
export type U__plans_plan_run_ai_text_keyword_extraction_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_keyword_extraction_Params
>
export type U__plans_plan_run_ai_text_language_detection_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_language_detection_Params
>
export type U__plans_plan_run_ai_text_paraphrase_detection_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_paraphrase_detection_Params
>
export type U__plans_plan_run_ai_text_sentence_similarity_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_sentence_similarity_Params
>
export type U__plans_plan_run_ai_text_emotion_detection_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_emotion_detection_Params
>
export type U__plans_plan_run_ai_text_Params = z.infer<
	typeof z_U__plans_plan_run_ai_text_Params
>
