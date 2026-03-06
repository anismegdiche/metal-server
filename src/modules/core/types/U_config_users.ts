//
//
//
import z from "zod"

//
export const z_U_config_users_user = z
	.object({
		password: z.union([z.string(), z.number()]).describe("Password"),
		secret: z.string().optional().describe("Secret key"),
		roles: z.array(z.string()).optional().describe("List of roles"),
	})
	.describe("User parameters")

export const z_U_config_users = z.record(z.string(), z_U_config_users_user).describe("Users")

//
export type U_config_users_user = z.infer<typeof z_U_config_users_user>
export type U_config_users = z.infer<typeof z_U_config_users>
