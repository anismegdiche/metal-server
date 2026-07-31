//
//
//
import { CustomEvent } from "@dimkl/events"
import { _MTR_ } from "@metal/config"
import { Logger } from "@metal/logger"
//
import type { TJson } from "@metal/types"
import { Assert } from "../../utils/Assert"
import { AUTH_PERMISSION } from "../auth/@consts"
import type { TUserTokenInfo } from "../auth/@types"
import { Roles } from "../auth/Roles"
import { ConfigManager } from "../core/ConfigManager"
import { HttpResponse } from "../core/HttpResponse"
import type { TInternalResponse } from "../core/types/TInternalResponse"
import { MetricsCollector } from "../metrics/MetricsCollector"
import { Plan } from "./Plan"
import { PLAN_METRICS, PlanMetrics, type T_PlanMetrics } from "./PlanMetrics"
import { Plans } from "./Plans"
import { Schedule } from "./Schedule"
import type { U__plans } from "./types/U__plans"

//
export class PlansManager {
	static Config: U__plans = {}

	@Logger.LogFunction()
	static async Init() {
		if (!ConfigManager.Has("plans")) return

		PlansManager.Config = ConfigManager.Get<U__plans>("plans") ?? {}

		const plans = Object.keys(PlansManager.Config)

		plans.forEach((planName) => {
			PlansManager.AddPlan(planName)
		})

		MetricsCollector.DispatchEvent_set(_MTR_.PLANS_TOTAL, plans.length)
		MetricsCollector.DispatchEvent_set(_MTR_.PLANS_ACTIVE, 0)
		MetricsCollector.DispatchEvent_set(_MTR_.PLANS_EXECUTION, 0)
	}

	@Logger.LogFunction()
	static AddPlan(planName: string) {
		const _plan = new Plan(planName)
		_plan.Init()
		Plans.set(planName, _plan)

		PlanMetrics.Bus.dispatchEvent(
			new CustomEvent<Partial<T_PlanMetrics>>(PLAN_METRICS.PLAN_SET, {
				data: {
					planName,
					steps: [],
				} as Partial<T_PlanMetrics>,
			}),
		)
	}

	@Logger.LogFunction()
	static RemovePlan(planName: string) {
		const _plan = new Plan(planName)
		_plan.Dispose()
		Plans.delete(planName)
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
				PlansManager.RemovePlan(name)
			}
		}

		// 5. Update or Add plans
		for (const name of newPlanNames) {
			if (Plans.has(name)) {
				Logger.Debug(`Updating plan '${name}'`)
				PlansManager.RemovePlan(name)
				PlansManager.AddPlan(name)
			} else {
				PlansManager.AddPlan(name)
			}
		}

		// 6. Refresh schedules
		Schedule.StopAll()
		await Schedule.Init()

		Logger.Info(`${Logger.Out} Plans and schedules reloaded successfully`)
	}

	@Logger.LogFunction()
	static async ReloadPlan(planName: string, userToken?: TUserTokenInfo): Promise<TInternalResponse<TJson>> {
		Roles.CheckPermission(userToken, undefined, AUTH_PERMISSION.ADMIN)

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

	static Clear(): void {
		for (const plan of Plans.values()) {
			plan.Dispose()
		}
		Plans.clear()
		PlansManager.Config = {}
	}
}
