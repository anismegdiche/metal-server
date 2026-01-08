//
//
//
//
import { z } from 'zod'

//
export const z_TIpPort = z.number().int().min(1).max(65535);

export type TIpPort = z.infer<typeof z_TIpPort>;

