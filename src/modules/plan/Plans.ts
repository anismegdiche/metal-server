//
//
//
import _ from "lodash"
//
import { TJson } from "../../types/TJson"
import { Plan } from "./Plan"
import { ConfigManager } from "../core/ConfigManager"


//
export class Plans {

    static readonly Plans = new Map<string, Plan>()

    static Init() {
        if (!ConfigManager.Has('plans'))
            return


        const plans = _.keys(ConfigManager.Get<TJson>("plans") ?? {})

        plans.forEach((plan: string) => {
            Plans.Plans.set(plan, new Plan(plan))
            Plans.Plans.get(plan)?.Init()
        })
    }
}