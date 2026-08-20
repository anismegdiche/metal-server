//
//
//
import { z_T_IntPositive } from "@metal/types"
import z from "zod"
//
import { z_U__server_authentication_demo } from "./U__server_authentication_demo"
import { z_U__server_authentication_local } from "./U__server_authentication_local"
import { z_U__server_authentication_oidc } from "./U__server_authentication_oidc"

//
export const z_U__server_authentication = z
	.object({
		"default-role": z.string().optional(),
		"session-lifetime": z_T_IntPositive.min(60).default(14400).optional(),
		"session-timeout": z_T_IntPositive.min(60).default(3600).optional(),
	})
	.and(
		z.discriminatedUnion("provider", [
			z_U__server_authentication_local,
			z_U__server_authentication_demo,
			z_U__server_authentication_oidc,
		])
	).default(z_U__server_authentication_local.parse({}))

//
export type U__server_authentication = z.infer<typeof z_U__server_authentication>
