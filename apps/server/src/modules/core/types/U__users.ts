//
//
//
import z from "zod"

//
export const z_U__users_user = z
	.object({
		password: z.union([
			z.string(),
			z.number()
		]),
		secret: z.string()
			.optional(),
		roles: z.array(
			z.string()
		)
			.optional(),
	})

export const z_U__users = z.record(
	z.string(),
	z_U__users_user
).default({})

//
export type U__users_user = z.infer<typeof z_U__users_user>
export type U__users = z.infer<typeof z_U__users>
