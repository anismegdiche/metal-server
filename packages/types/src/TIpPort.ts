import type { z } from "zod"
import { z_T_IntPositive } from "./T_IntPositive"

export const z_TIpPort = z_T_IntPositive.min(1).max(65535)

export type TIpPort = z.infer<typeof z_TIpPort>
