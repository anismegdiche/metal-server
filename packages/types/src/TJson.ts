import { z } from "zod"

export const z_TJson = z.record(z.string(), z.any())
export function z_TJsonOf<T extends z.ZodTypeAny>(valueSchema: T) {
	return z.record(z.string(), valueSchema) as z.ZodRecord<z.ZodString, T>
}

export type TJson<T = any> = Record<string, T>
