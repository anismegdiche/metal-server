//
//
//
import z from "zod"
//
import { z_U__roles_role_permissions } from "../../auth/types/U__roles_role_permissions"

//
export const z_U__roles = z.record(z.string(), z_U__roles_role_permissions)

//
export type U__roles = z.infer<typeof z_U__roles>
