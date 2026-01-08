//
//
//
import z from "zod";
//
import { AUTH_PROVIDER } from "../@consts";


//
export const z_U_config_server_authentication_local = z.object({
    provider: z.literal(AUTH_PROVIDER.LOCAL),
});


//
export type U_config_server_authentication_local = z.infer<typeof z_U_config_server_authentication_local>
