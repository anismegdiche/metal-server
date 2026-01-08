//
//
//
import * as _ from 'lodash-es'
//
import type { TJson } from "../../types/TJson"
import { Plan } from "./Plan"
import { ConfigManager } from "../core/ConfigManager"


//
export class Plans {

    static readonly Plans = new Map<string, Plan>()

    static async Init() {
        if (!ConfigManager.Has('plans'))
            return


        const plans = _.keys(ConfigManager.Get<TJson>("plans") ?? {})

        plans.forEach(async (plan: string) => {
            Plans.Plans.set(plan, new Plan(plan))
            await Plans.Plans.get(plan)?.Init()
        })
    }
}