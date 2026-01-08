//
//
//
import z from "zod";
//
import { z_TUrl } from "../../../types/TUrl";
import { AI_ENGINE } from "../@consts";
import { AUDIO_TASK } from "../consts/AUDIO";
import { IMAGE_TASK } from "../consts/IMAGE";
import { OCR_TASK } from "../consts/OCR";
import { TEXT_TASK } from "../consts/TEXT";


//
export const z_AI_ENGINE_TASK_MATRIX = z.union([
    z.literal(`${AI_ENGINE.OCR}-${OCR_TASK}`),
    z.literal(`${AI_ENGINE.TEXT}-${TEXT_TASK}`),
    z.literal(`${AI_ENGINE.IMAGE}-${IMAGE_TASK}`),
    z.literal(`${AI_ENGINE.AUDIO}-${AUDIO_TASK}`),
])

export const z_T_config_ai_engines_ai_engine = z.object({
    engine: z_AI_ENGINE_TASK_MATRIX,
    model: z.string().optional(),
    url: z_TUrl.optional(),
})


//
// export type AI_ENGINE_TASK_MATRIX =
//     `${AI_ENGINE.OCR}-${OCR_TASK}`
//     | `${AI_ENGINE.TEXT}-${TEXT_TASK}`
//     | `${AI_ENGINE.IMAGE}-${IMAGE_TASK}`
//     | `${AI_ENGINE.AUDIO}-${AUDIO_TASK}`;
export type AI_ENGINE_TASK_MATRIX = z.infer<typeof z_AI_ENGINE_TASK_MATRIX>
export type T_config_ai_engines_ai_engine = z.infer<typeof z_T_config_ai_engines_ai_engine>;
