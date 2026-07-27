//
//
//
import z from "zod"
//
import { z_T__ai_engines } from "../../ai-engine/types/T__ai_engines"
import { z_U__mcp } from "../../mcp/types/U__mcp"
import { z_U__plans } from "../../plan/types/U__plans"
import { z_U__schedules } from "../../plan/types/U__schedules"
import { z_U__roles } from "./U__roles"
import { z_U__schemas } from "./U__schemas"
import { z_U__server } from "./U__server"
import { z_U__sources } from "./U__sources"
import { z_U__users } from "./U__users"
import { z_U__version } from "./U__version"

//
export const z_U_config = z.strictObject({
	version: z_U__version,
	server: z_U__server.optional(),
	roles: z_U__roles.optional(),
	users: z_U__users.optional(),
	sources: z_U__sources,
	schemas: z_U__schemas.optional(),
	"ai-engines": z_T__ai_engines.optional(),
	plans: z_U__plans.optional(),
	schedules: z_U__schedules.optional(),
	mcp: z_U__mcp.optional(),
})

//
export type U_config = z.infer<typeof z_U_config>
