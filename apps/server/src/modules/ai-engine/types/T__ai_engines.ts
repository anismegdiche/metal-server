//
//
//
import z from "zod"
//
import { z_T__ai_engines_ai_engine } from "./T__ai_engines_ai_engine"

//
export const z_T__ai_engines = z.record(z.string(), z_T__ai_engines_ai_engine)

//
export type T__ai_engines = z.infer<typeof z_T__ai_engines>
