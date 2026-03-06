//
//
//
import z from "zod"
//
import { z_U_config_server_authentication_demo } from "./U_config_server_authentication_demo"
import { z_U_config_server_authentication_local } from "./U_config_server_authentication_local"
import { z_U_config_server_authentication_oidc } from "./U_config_server_authentication_oidc"

//
export const z_U_config_server_authentication = z
	.object({
		"default-role": z.string().optional(),
	})
	.and(
		z.discriminatedUnion("provider", [
			z_U_config_server_authentication_local,
			z_U_config_server_authentication_demo,
			z_U_config_server_authentication_oidc,
		]),
	)

//
export type U_config_server_authentication = z.infer<typeof z_U_config_server_authentication>
