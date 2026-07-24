//
//
//
import z from "zod"

//
export const z_U__mcp = z.strictObject({
	enabled: z.boolean().default(false),
	route: z.string().default("/mcp"),
	"hide-sensitive-data": z.array(z.string()).optional(),
})

//
export type U__mcp = z.infer<typeof z_U__mcp>
