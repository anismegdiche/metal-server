//
//
//
import z from "zod";
//
import { z_entity, z_schema } from "../../schema/types/TSchemaRequest";
import { STEP_ON_ERROR_RETRY_AFTER_RETRIES, STEP_ON_ERROR_RETRY_BACKOFF, STEP_ON_ERROR_SCOPE, STEP_ON_ERROR_STRATEGY } from "../@consts";


//
export const z__on_error_scope = z
	.enum(STEP_ON_ERROR_SCOPE, { message: "Invalid on-error.scope: must be one of: step, row, or plan" })
	.default(STEP_ON_ERROR_SCOPE.STEP)

export const z__on_error_retry = z
	.object({
		attempts: z.number()
			.min(1, { message: "on-error.retry.attempts must be at least 1" })
			.default(1),
		delay: z.number()
			.min(0, { message: "on-error.retry.delay must be at least 0" })
			.default(1000),
		backoff: z.enum(STEP_ON_ERROR_RETRY_BACKOFF, { message: "Invalid on-error.retry.backoff: must be one of: fixed, exponential, linear" })
			.default(STEP_ON_ERROR_RETRY_BACKOFF.FIXED),
		"max-delay": z.number()
			.min(0, { message: "on-error.retry.max-delay must be at least 0" })
			.default(30000),
		"after-retries": z.enum(STEP_ON_ERROR_RETRY_AFTER_RETRIES)
			.default(STEP_ON_ERROR_RETRY_AFTER_RETRIES.THROW),
	})

export const z__on_error_sink = z.object({
	schema: z_schema,
	entity: z_entity,
	"include-error": z.boolean()
		.default(true),
	"error-field": z.string()
		.default("error-details"),
})

//
export const z_U__on_error_strategy_throw = z
	.object({
		strategy: z.literal(STEP_ON_ERROR_STRATEGY.THROW),
		scope: z.literal(STEP_ON_ERROR_SCOPE.STEP)
			.default(STEP_ON_ERROR_SCOPE.STEP),
	})

export const z_U__on_error_strategy_skip = z
	.object({
		strategy: z.literal(STEP_ON_ERROR_STRATEGY.SKIP)
			.default(STEP_ON_ERROR_STRATEGY.SKIP),
		scope: z__on_error_scope
			.default(STEP_ON_ERROR_SCOPE.STEP),
	})

export const z_U__on_error_strategy_retry_step = z
	.object({
		strategy: z.literal(STEP_ON_ERROR_STRATEGY.RETRY)
			.default(STEP_ON_ERROR_STRATEGY.RETRY),
		scope: z.literal(STEP_ON_ERROR_SCOPE.STEP)
			.default(STEP_ON_ERROR_SCOPE.STEP),
		retry: z__on_error_retry
		// sink not allowed for step scope
	})

export const z_U__on_error_strategy_retry_row = z
	.object({
		strategy: z.literal(STEP_ON_ERROR_STRATEGY.RETRY)
			.default(STEP_ON_ERROR_STRATEGY.RETRY),
		scope: z.literal(STEP_ON_ERROR_SCOPE.ROW)
			.default(STEP_ON_ERROR_SCOPE.ROW),
		retry: z__on_error_retry,
		sink: z__on_error_sink
			.optional()
	})
	.superRefine((data, ctx) => {
		if (data.retry["after-retries"] === STEP_ON_ERROR_RETRY_AFTER_RETRIES.SINK && !data.sink) {
			ctx.addIssue({
				code: "custom",
				message: "sink configuration is required when after-retries is 'sink'",
				path: ["sink"]
			});
		}
	})

export const z_U__on_error_strategy_retry = z.discriminatedUnion("scope", [
	z_U__on_error_strategy_retry_step,
	z_U__on_error_strategy_retry_row
])

export const z_U__on_error_strategy_sink = z
	.object({
		strategy: z.literal(STEP_ON_ERROR_STRATEGY.SINK)
			.default(STEP_ON_ERROR_STRATEGY.SINK),
		scope: z.literal(STEP_ON_ERROR_SCOPE.ROW)
			.default(STEP_ON_ERROR_SCOPE.ROW),
		sink: z__on_error_sink,
	})

//
export const z_U__on_error_Params = z
	.discriminatedUnion("strategy", [
		z_U__on_error_strategy_throw,
		z_U__on_error_strategy_skip,
		z_U__on_error_strategy_retry,
		z_U__on_error_strategy_sink
	]).default({
		strategy: STEP_ON_ERROR_STRATEGY.THROW,
		scope: STEP_ON_ERROR_SCOPE.STEP
	})


export const z_U__on_error = z.object({
	"on-error": z_U__on_error_Params.optional()
})


//
export type U__on_error_strategy_throw = z.infer<typeof z_U__on_error_strategy_throw>
export type U__on_error_strategy_skip = z.infer<typeof z_U__on_error_strategy_skip>
export type U__on_error_strategy_retry_step = z.infer<typeof z_U__on_error_strategy_retry_step>
export type U__on_error_strategy_retry_row = z.infer<typeof z_U__on_error_strategy_retry_row>
export type U__on_error_strategy_retry = z.infer<typeof z_U__on_error_strategy_retry>
export type U__on_error_strategy_sink = z.infer<typeof z_U__on_error_strategy_sink>

//
export type U__on_error_Params = z.infer<typeof z_U__on_error_Params>
export type U__on_error = z.infer<typeof z_U__on_error>