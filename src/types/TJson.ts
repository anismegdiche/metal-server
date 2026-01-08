//
//
//
import { z } from "zod";


//
export const z_TJson = z.record(
    z.string(),
    z.any()
);


//
export type TJson<T = unknown> = z.infer<typeof z_TJson>;
