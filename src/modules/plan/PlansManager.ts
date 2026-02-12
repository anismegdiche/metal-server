//
//
//
import { Assert } from "../../utils/Assert"
import { ConfigManager } from "../core/ConfigManager"
import { Plan } from "./Plan"
import { Plans } from "./Plans"
import type { U_config_plans } from './types/U_config_plans'


//
export class PlansManager {

    static Config: U_config_plans = {}

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return

        PlansManager.Config = ConfigManager.Get<U_config_plans>("plans") ?? {}
        
        const plans = Object.keys(PlansManager.Config)

        plans.forEach(async (plan: string) => {
            Plans.set(plan, new Plan(plan))
            Assert.Var<Plan>(Plans.get(plan), `Plan '${plan}' not set`)
            await Plans.get(plan)!.Init()
        })
    }
}