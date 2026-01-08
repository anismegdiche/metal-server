//
//
//
import z from "zod"
//
import { z_T_config_ai_engines } from "../../ai-engine/types/T_config_ai_engines"
import { z_U_config_plans } from "../../plan/types/U_config_plans"
import { z_U_config_schedules } from "../../plan/types/U_config_schedules"
import { z_U_config_roles } from "./U_config_roles"
import { z_U_config_schemas } from "./U_config_schemas"
import { z_U_config_server } from "./U_config_server"
import { z_U_config_sources } from "./U_config_sources"
import { z_U_config_users } from "./U_config_users"
import { z_U_config_version } from "./U_config_version"


//
export const z_U_config = z.strictObject({
    version: z_U_config_version,
    server: z_U_config_server.optional(),
    roles: z_U_config_roles.optional(),
    users: z_U_config_users.optional(),
    sources: z_U_config_sources,
    schemas: z_U_config_schemas.optional(),
    "ai-engines": z_T_config_ai_engines.optional(),
    plans: z_U_config_plans.optional(),
    schedules: z_U_config_schedules.optional(),
});


//
export type U_config = z.infer<typeof z_U_config>
