import { z } from "zod"

export const z_T_IntPositive = z.number().int().positive({ message: "must be a positive integer" })

export type T_IntPositive = z.infer<typeof z_T_IntPositive>
