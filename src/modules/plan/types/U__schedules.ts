//
//
//
import z from "zod"

//
export const z_U__schedules_schedule = z
	.object({
		plan: z.string().describe("Plan name"),
		entity: z.string().describe("Entity name"),
		cron: z
			.string()
			// eslint-disable-next-line security/detect-unsafe-regex
			.regex(
				/(@(annually|yearly|monthly|weekly|daily|hourly|start))|(@every (\d+(ns|us|µs|ms|s|m|h))+)|((((\d+,)+\d+|([\d*]+(\/|-)\d+)|\d+|\*) ?){5,7})/,
			)
			.describe("Cron expression"),
	})
	.describe("Schedule")

export const z_U__schedules = z
	.record(z.string().describe("Schedule name"), z_U__schedules_schedule)
	.describe("Schedules")

//
export type U__schedules_schedule = z.infer<typeof z_U__schedules_schedule>
export type U__schedules = z.infer<typeof z_U__schedules>
