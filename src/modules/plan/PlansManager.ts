//
//
//
import type { TJson } from "../../types/TJson"
import { Assert } from "../../utils/Assert"
import { Logger } from "../../utils/Logger"
import type { TUserTokenInfo } from "../auth/@types"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { Plan } from "./Plan"
import { Plans } from "./Plans"
import { Schedule } from "./Schedule"
import type { U_config_plans } from "./types/U_config_plans"

//
export class PlansManager {
	static Config: U_config_plans = {}

	@Logger.LogFunction()
	static async Init() {
		if (!ConfigManager.Has("plans")) return

		PlansManager.Config = ConfigManager.Get<U_config_plans>("plans") ?? {}

		const plans = Object.keys(PlansManager.Config)

		for (const plan of plans) {
			Plans.set(plan, new Plan(plan))
			Assert.Var<Plan>(Plans.get(plan), `Plan '${plan}' not set`)
			await Plans.get(plan)?.Init()
		}
	}

	@Logger.LogFunction()
	static async Reload() {
		Logger.Info(`${Logger.In} Reloading plans and schedules...`)

		// 1. Reload raw config from file
		const configFileJson = await ConfigManager.Load()

		// 2. Update ConfigManager state for plans and schedules
		ConfigManager.Set("plans", configFileJson.plans)
		ConfigManager.Set("schedules", configFileJson.schedules)

		// 3. Update PlansManager config reference
		PlansManager.Config = configFileJson.plans ?? {}

		const newPlanNames = Object.keys(PlansManager.Config)
		const currentPlanNames = Array.from(Plans.keys())

		// 4. Remove plans no longer in config
		for (const name of currentPlanNames) {
			if (!newPlanNames.includes(name)) {
				Logger.Debug(`Removing plan '${name}'`)
				await Plans.get(name)?.Disconnect()
				Plans.delete(name)
			}
		}

		// 5. Update or Add plans
		for (const name of newPlanNames) {
			if (Plans.has(name)) {
				Logger.Debug(`Updating plan '${name}'`)
				await Plans.get(name)?.Disconnect()
				await Plans.get(name)?.Init()
			} else {
				Logger.Debug(`Adding new plan '${name}'`)
				Plans.set(name, new Plan(name))
				await Plans.get(name)?.Init()
			}
		}

		// 6. Refresh schedules
		Schedule.StopAll()
		await Schedule.Init()

		Logger.Info(`${Logger.Out} Plans and schedules reloaded successfully`)
	}

	@Logger.LogFunction()
	static async ReloadPlan(planName: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		const plan = Plans.get(planName)
		Assert.Var<Plan>(plan, `Plan '${planName}' not found`)

		const result = await plan?.Reload(planName, userToken)

		// Refresh schedules as well (as per user requirement "reload config... reload schedules")
		Schedule.StopAll()
		await Schedule.Init()

		return HttpResponse.Ok({
			...result?.Body,
			message: `Plan '${planName}' and schedules reloaded`,
		})
	}

	static async Clear() {
		for (const plan of Plans.values()) {
			await plan.Disconnect()
		}
		Plans.clear()
		PlansManager.Config = {}
	}
}
