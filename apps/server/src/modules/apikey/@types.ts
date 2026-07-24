//
//
//
import z from "zod"
//
export const z_TApiKeyCreate = z.object({
	name: z.string().min(1).max(128),
	scopes: z.array(z.string()).optional(),
})
//
export type TApiKeyCreate = z.infer<typeof z_TApiKeyCreate>
//
export type TApiKeyInfo = {
	id: string
	userId: string
	name: string
	prefix: string
	scopes: string[]
	createdAt: string
	lastUsedAt: string | null
	revokedAt: string | null
}
//
export type TApiKeyRecord = TApiKeyInfo & {
	hash: string
}
//
export type TApiKeyCreated = TApiKeyInfo & {
	key: string
}
