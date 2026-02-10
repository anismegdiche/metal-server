//
//
//
import z from "zod";
//
import { z_U_config_server_authentication_demo } from "../providers/DemoAuth";
import { z_U_config_server_authentication_local } from "../providers/LocalAuth";
import { z_U_config_server_authentication_oidc } from "../providers/OidcAuth";


//
export const z_U_config_server_authentication = z.object({
    "default-role": z.string().optional(),
}).and(z.discriminatedUnion("provider", [
    z_U_config_server_authentication_local,
    z_U_config_server_authentication_demo,
    z_U_config_server_authentication_oidc,
]));


//
export type U_config_server_authentication = z.infer<typeof z_U_config_server_authentication>
