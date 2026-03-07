//
//
//
import z from "zod"

//
export const z_U__users_user = z
	.object({
		password: z.union([z.string(), z.number()]).describe("Password"),
		secret: z.string().optional().describe("Secret key"),
		roles: z.array(z.string()).optional().describe("List of roles"),
	})
	.describe("User parameters")

export const z_U__users = z.record(z.string(), z_U__users_user).describe("Users")

//
export type U__users_user = z.infer<typeof z_U__users_user>
export type U__users = z.infer<typeof z_U__users>
