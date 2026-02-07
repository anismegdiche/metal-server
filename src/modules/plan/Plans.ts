//
//
//
import { Assert } from "../../utils/Assert"
import { ConfigManager } from "../core/ConfigManager"
import { Plan } from "./Plan"
import type { U_config_plans } from './types/U_config_plans'


//
export class Plans {

    static readonly Plans = new Map<string, Plan>()
    static Config: U_config_plans = {}

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return

        Plans.Config = ConfigManager.Get<U_config_plans>("plans") ?? {}
        
        const plans = Object.keys(Plans.Config)

        plans.forEach(async (plan: string) => {
            Plans.Plans.set(plan, new Plan(plan))
            Assert.Var<Plan>(Plans.Plans.get(plan), `Plan '${plan}' not set`)
            await Plans.Plans.get(plan)!.Init()
        })
    }
}