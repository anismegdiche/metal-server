//
//
//
import z from "zod";
//
import { z_TIpPort } from "../../../types/TIpPort";
import { z_TJson } from "../../../types/TJson";
import { DATA_PROVIDER } from "../../source/@consts";


//
export const z_U_config_sources_source_options = z.record(
    z.string(),
    z.union([
        z.string(),
        z.number(),
        z_TJson,
        z.boolean()
    ])
);

export const z_U_config_sources_source = z.object({
    provider: z.enum(DATA_PROVIDER).describe("Provider type"),
    database: z.string().optional(),
    host: z.string().optional(),
    port: z_TIpPort.optional(),
    user: z.string().optional(),
    password: z.string().optional(),
    options: z_U_config_sources_source_options.optional(),
});

export const z_U_config_sources = z.record(
    z.string(),
    z_U_config_sources_source
);


//
export type U_config_sources_source = z.infer<typeof z_U_config_sources_source>
export type U_config_sources = z.infer<typeof z_U_config_sources>