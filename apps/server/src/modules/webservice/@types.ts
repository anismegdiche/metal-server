//
//
//
import { z_TJson, z_TJsonOf } from "@metal/types"
import z from "zod"


//
export const z_TEndpoint = z.object({
	Method: z.string(),
	Url: z.string(),
	Data: z.union([
		z_TJson,
		z.string()
	]),
	SessionHeaders: z_TJsonOf(z.string())
		.optional(),
	DataPath: z.string()
		.optional(),
})

export const z_TWebServiceEndpoint = z
	.object({
		data: z_TJson
			.optional(),
		response: z.string()
			.optional(),
		"session-headers": z_TJsonOf(z.string())
			.optional(),
	})
	.catchall(z.union([
		z_TJsonOf(z.string()),
		z.string(),
		z.null(),
		z.undefined()]
	))


//
export type TEndpoint = z.infer<typeof z_TEndpoint>
export type TWebServiceEndpoint = z.infer<typeof z_TWebServiceEndpoint>
