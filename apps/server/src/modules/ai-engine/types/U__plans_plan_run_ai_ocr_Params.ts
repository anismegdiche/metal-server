//
//
//
import { z } from "zod"
//
import { OCR_LANG_ISO, OCR_TASK } from "../consts/OCR"

//
export const z_U__plans_plan_run_ai_ocr_Params = z.object({
	task: z.enum(OCR_TASK),
	params: z
		.object({
			lang: z.enum(OCR_LANG_ISO),
		})
		.optional(),
})

//
export type U__plans_plan_run_ai_ocr_Params = z.infer<
	typeof z_U__plans_plan_run_ai_ocr_Params
>
