import z from "zod"
import { AUTH_PROVIDER } from "../@consts"

export const z_U_config_server_authentication_oidc = z.object({
    provider: z.literal(AUTH_PROVIDER.OIDC),
    issuer: z.string(),
    "client-id": z.string(),
    "client-secret": z.string(),
    scope: z.string().optional(),
    "roles-path": z.string().optional(),
})

export type U_config_server_authentication_oidc = z.infer<typeof z_U_config_server_authentication_oidc>
