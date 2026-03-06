//
//
//
import z from "zod"

//
export const z_TUserCredentials = z.object({
	username: z.string().min(1).max(64),
	password: z.string().min(1).max(64),
})

//
export type TUserCredentials = z.infer<typeof z_TUserCredentials>
export type TUserToken = string | undefined
export type TUserTokenInfo = {
	user: string
	roles?: string[]
}
