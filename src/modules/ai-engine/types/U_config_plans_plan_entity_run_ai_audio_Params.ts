//
//
//
import { z } from "zod"
//
import { AUDIO_TASK } from "../consts/AUDIO"

//
export const z_U_config_plans_plan_entity_run_ai_audio_audio_classification_Params = z.object({
	task: z.literal(AUDIO_TASK.AUDIO_CLASSIFICATION),
	params: z.undefined(),
})

export const z_U_config_plans_plan_entity_run_ai_audio_automatic_speech_recognition_Params = z.object({
	task: z.literal(AUDIO_TASK.AUTOMATIC_SPEECH_RECOGNITION),
	params: z.undefined(),
})

export const z_U_config_plans_plan_entity_run_ai_audio_Params = z.discriminatedUnion("task", [
	z_U_config_plans_plan_entity_run_ai_audio_audio_classification_Params,
	z_U_config_plans_plan_entity_run_ai_audio_automatic_speech_recognition_Params,
])

//
export type U_config_plans_plan_entity_run_ai_audio_audio_classification_Params = z.infer<
	typeof z_U_config_plans_plan_entity_run_ai_audio_audio_classification_Params
>
export type U_config_plans_plan_entity_run_ai_audio_automatic_speech_recognition_Params = z.infer<
	typeof z_U_config_plans_plan_entity_run_ai_audio_automatic_speech_recognition_Params
>
export type U_config_plans_plan_entity_run_ai_audio_Params = z.infer<
	typeof z_U_config_plans_plan_entity_run_ai_audio_Params
>
