//
//
//
import z from "zod"
//
import { z_T_config_ai_engines_ai_engine } from "./T_config_ai_engines_ai_engine";


//
export const z_T_config_ai_engines = z.record(
    z.string(),
    z_T_config_ai_engines_ai_engine
);


//
export type T_config_ai_engines = z.infer<typeof z_T_config_ai_engines>;
