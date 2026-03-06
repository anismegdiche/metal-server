//
//
//
import z from "zod"
//
import { type TJson, z_TJson, z_TJsonOf } from "../../types/TJson"

//
export const z_TEndpoint = z.object({
	Method: z.string(),
	Url: z.string(),
	Data: z.union([z_TJson, z.string()]),
	SessionHeaders: z_TJsonOf(z.string()).optional(),
	DataPath: z.string().optional(),
})

//
export type TEndpoint = z.infer<typeof z_TEndpoint>

export type TWebServiceEndpoint = {
	[method: string]: TJson<string> | string | null | undefined
} & {
	data?: TJson
	response?: string
	"session-headers"?: TJson<string>
}
