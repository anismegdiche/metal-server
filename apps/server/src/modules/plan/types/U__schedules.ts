//
//
//
import z from "zod"

//
export const z_U__schedules_schedule = z
	.object({
		plan: z.string(),
		cron: z
			.string()

			.regex(
				/(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|([\d*]+(\/|-)\d+)|\d+|\*) ?){5,7})/,
			),
	})

export const z_U__schedules = z
	.record(
		z.string(),
		z_U__schedules_schedule
	)

//
export type U__schedules_schedule = z.infer<typeof z_U__schedules_schedule>
export type U__schedules = z.infer<typeof z_U__schedules>
