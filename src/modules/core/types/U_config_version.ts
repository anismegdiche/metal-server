//
import z from "zod"
//
//
//


//
export const z_U_config_version = z.literal("0.5");

export type U_config_version = z.infer<typeof z_U_config_version>
