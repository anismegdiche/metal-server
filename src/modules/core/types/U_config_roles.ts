//
//
//
import z from "zod"
//
import { z_U_config_roles_role_permissions } from "../../auth/types/U_config_roles_role_permissions";


//
export const z_U_config_roles = z.record(
    z.string(),
    z_U_config_roles_role_permissions
);


//
export type U_config_roles = z.infer<typeof z_U_config_roles>

