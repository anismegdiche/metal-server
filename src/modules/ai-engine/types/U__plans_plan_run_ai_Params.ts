//
//
//
import z from "zod"
//
import { z_U__plans_plan_run_ai_audio_Params } from "./U__plans_plan_run_ai_audio_Params"
import { z_U__plans_plan_run_ai_image_Params } from "./U__plans_plan_run_ai_image_Params"
import { z_U__plans_plan_run_ai_ocr_Params } from "./U__plans_plan_run_ai_ocr_Params"
import { z_U__plans_plan_run_ai_text_Params } from "./U__plans_plan_run_ai_text_Params"

//
export const z_U__plans_plan_run_ai_Params = z.union([
	z_U__plans_plan_run_ai_ocr_Params,
	z_U__plans_plan_run_ai_text_Params,
	z_U__plans_plan_run_ai_image_Params,
	z_U__plans_plan_run_ai_audio_Params,
])

//
export type U__plans_plan_run_ai_Params = z.infer<typeof z_U__plans_plan_run_ai_Params>
