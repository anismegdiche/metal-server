//
//
//
import { z } from "zod"
//
import { IMAGE_TASK } from "../consts/IMAGE"

//
export const z_U__plans_plan_run_ai_image_image_classification_Params = z.object({
	task: z.literal(IMAGE_TASK.IMAGE_CLASSIFICATION),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_image_image_segmentation_Params = z.object({
	task: z.literal(IMAGE_TASK.IMAGE_SEGMENTATION),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_image_object_detection_Params = z.object({
	task: z.literal(IMAGE_TASK.OBJECT_DETECTION),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_image_image_to_text_Params = z.object({
	task: z.literal(IMAGE_TASK.IMAGE_TO_TEXT),
	params: z.undefined(),
})

export const z_U__plans_plan_run_ai_image_visual_question_answering_Params = z.object({
	task: z.literal(IMAGE_TASK.VISUAL_QUESTION_ANSWERING),
	params: z.object({
		question: z.string(),
	}),
})

export const z_U__plans_plan_run_ai_image_Params = z.discriminatedUnion("task", [
	z_U__plans_plan_run_ai_image_image_classification_Params,
	z_U__plans_plan_run_ai_image_image_segmentation_Params,
	z_U__plans_plan_run_ai_image_object_detection_Params,
	z_U__plans_plan_run_ai_image_image_to_text_Params,
	z_U__plans_plan_run_ai_image_visual_question_answering_Params,
])

//
export type U__plans_plan_run_ai_image_image_classification_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_image_classification_Params
>
export type U__plans_plan_run_ai_image_image_segmentation_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_image_segmentation_Params
>
export type U__plans_plan_run_ai_image_object_detection_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_object_detection_Params
>
export type U__plans_plan_run_ai_image_image_to_text_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_image_to_text_Params
>
export type U__plans_plan_run_ai_image_visual_question_answering_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_visual_question_answering_Params
>
export type U__plans_plan_run_ai_image_Params = z.infer<
	typeof z_U__plans_plan_run_ai_image_Params
>
