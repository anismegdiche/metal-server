//
//
//
import z from "zod"

//
export const z_U__roles_role_permissions = z.union([
	z.null(),
	z
		.string()
		.min(1)
		.max(6)
		.regex(/^(?!.*(.).*\1)[crudla]{1,6}$/),
])

//
export type U__roles_role_permissions = z.infer<typeof z_U__roles_role_permissions>
