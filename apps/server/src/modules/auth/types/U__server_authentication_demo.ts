import z from "zod"
import { AUTH_PROVIDER } from "../@consts"

export const z_U__server_authentication_demo = z.object({
    provider: z.literal(AUTH_PROVIDER.DEMO).default(AUTH_PROVIDER.DEMO),
})

export type U__server_authentication_demo = z.infer<typeof z_U__server_authentication_demo>
